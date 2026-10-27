import io
import json
import os
from pathlib import Path
import socket
import sys
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


def input_data():
    return {"direction": "AI 产品",
            "jobs": [{"id": "j", "title": "岗位", "company": "单位",
                      "rawJD": "掌握 SQL 基础查询。", "requirements": [
                          {"id": "j:0", "label": "SQL", "quote": "掌握 SQL 基础查询。", "must": True}]}],
            "experiences": [{"id": "e", "title": "项目", "description": "使用 SQL 查询数据。"}]}


def output_data():
    return {"groups": [{"label": "SQL 数据查询", "dimension": "data", "status": "partial",
                         "sources": [{"jobId": "j", "quote": "掌握 SQL 基础查询。", "must": True,
                                      "level": "基础查询", "requirementIds": ["j:0"]}],
                         "evidence": [{"experienceId": "e", "quote": "使用 SQL 查询数据。", "relation": "对应查询行动"}],
                         "reason": "材料覆盖了查询行动，仍需查看具体复杂度。", "missing": ["具体查询例子"], "nextStep": "补充示例"}]}


class DomainTests(unittest.TestCase):
    def test_citation_validation(self):
        self.assertEqual(server.validate_output(input_data(), output_data())["groups"][0]["status"], "partial")
        for mutate in [
            lambda o: o["groups"][0]["sources"][0].update(jobId="not-selected"),
            lambda o: o["groups"][0]["sources"][0].update(quote="不存在的原文"),
            lambda o: o["groups"][0]["evidence"][0].update(quote="不存在的个人成果"),
            lambda o: o["groups"][0]["sources"][0].update(requirementIds=[]),
            lambda o: o["groups"][0].update(evidence=[]),
        ]:
            value = output_data()
            mutate(value)
            with self.assertRaises(ValueError):
                server.validate_output(input_data(), value)

    def test_input_caps_and_quote_alignment(self):
        self.assertIsNotNone(server.validate_input(input_data()))
        data = input_data()
        data["jobs"] *= 21
        with self.assertRaises(ValueError):
            server.validate_input(data)
        data = input_data()
        data["jobs"][0]["requirements"][0]["quote"] = "错误引文"
        with self.assertRaises(ValueError):
            server.validate_input(data)

    def test_no_key_has_no_fake_ai_result(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            with self.assertRaisesRegex(ValueError, "尚未配置"):
                server.call_ai(input_data())

    def test_responses_request_schema_store_false_and_evidence_validation(self):
        seen = {}
        def opener(request, timeout):
            seen["url"] = request.full_url
            seen["body"] = json.loads(request.data)
            return io.BytesIO(json.dumps({"status": "completed", "output": [
                {"type": "message", "content": [{"type": "output_text", "text": json.dumps(output_data())}]}]}).encode())
        with patch.dict(os.environ, {"OPENAI_API_KEY": "unit-test-placeholder", "OPENAI_MODEL": "gpt-5-mini"}):
            response = server.call_ai(input_data(), opener=opener)
        self.assertEqual(response["mode"], "ai")
        self.assertEqual(seen["url"], "https://api.openai.com/v1/responses")
        self.assertFalse(seen["body"]["store"])
        self.assertTrue(seen["body"]["text"]["format"]["strict"])
        self.assertNotIn("unit-test-placeholder", json.dumps(response))

    def test_incomplete_model_response_is_not_accepted(self):
        def opener(request, timeout):
            return io.BytesIO(b'{"status":"incomplete","output":[]}')
        with patch.dict(os.environ, {"OPENAI_API_KEY": "unit-test-placeholder"}):
            with self.assertRaisesRegex(ValueError, "未完整"):
                server.call_ai(input_data(), opener=opener)

    def test_ssrf_checks_all_dns_addresses_and_blocks_private_metadata(self):
        def resolve(ip):
            return lambda *a, **k: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))]
        for url in ["http://localhost/a", "http://169.254.169.254/latest", "https://example.com/private"]:
            with self.assertRaises(ValueError):
                server.public_target(url, resolver=resolve("127.0.0.1"))
        for url in ["file:///etc/passwd", "http://name:password@example.com", "https://example.com:8080"]:
            with self.assertRaises(ValueError):
                server.public_target(url, resolver=resolve("8.8.8.8"))
        mixed = lambda *a, **k: resolve("8.8.8.8")() + resolve("10.0.0.1")()
        with self.assertRaises(ValueError):
            server.public_target("https://example.com", resolver=mixed)
        parsed, ip = server.public_target("https://example.com/jd", resolver=resolve("8.8.8.8"))
        self.assertEqual(parsed.hostname, "example.com")
        self.assertEqual(ip, "8.8.8.8")

    def test_parser_retains_text_but_omits_scripts(self):
        parser = server.PageText()
        parser.feed("<title>岗位</title><script>SECRET_JS</script><p>SQL 工作要求</p><style>CSS</style>")
        self.assertIn("SQL 工作要求", "".join(parser.parts))
        self.assertNotIn("SECRET_JS", "".join(parser.parts))
        self.assertEqual("".join(parser.title), "岗位")


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = server.make_server(port=0)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = "http://127.0.0.1:" + str(cls.httpd.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.thread.join()

    def request(self, path, body=None, headers=None):
        headers = headers or {}
        if body is not None:
            headers.setdefault("Content-Type", "application/json")
            req = Request(self.base + path, data=json.dumps(body).encode(), headers=headers, method="POST")
        else:
            req = Request(self.base + path, headers=headers)
        try:
            response = urlopen(req, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            return response.status, response.headers, response.read()

    def auth(self):
        return {"X-InternPilot-CSRF": self.httpd.csrf, "Origin": self.base}

    def test_status_exposes_no_key_and_has_no_store(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "unit-test-placeholder"}):
            status, headers, raw = self.request("/api/status")
        self.assertEqual(status, 200)
        self.assertNotIn(b"unit-test-placeholder", raw)
        self.assertTrue(json.loads(raw)["configured"])
        self.assertEqual(headers["Cache-Control"], "no-store")

    def test_host_origin_and_csrf_are_enforced(self):
        status, _, _ = self.request("/api/status", headers={"Host": "attacker.invalid"})
        self.assertEqual(status, 403)
        status, _, _ = self.request("/api/analyze", {"consent": True, "input": input_data()})
        self.assertEqual(status, 403)
        headers = {**self.auth(), "Origin": "https://attacker.invalid"}
        status, _, _ = self.request("/api/analyze", {"consent": True, "input": input_data()}, headers)
        self.assertEqual(status, 403)

    def test_explicit_consent_required(self):
        status, _, raw = self.request("/api/analyze", {"input": input_data()}, self.auth())
        self.assertEqual(status, 400)
        self.assertIn("同意", json.loads(raw)["error"])

    def test_missing_ai_key_returns_error_not_preview_labelled_ai(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            status, _, raw = self.request("/api/analyze", {"consent": True, "input": input_data()}, self.auth())
        self.assertEqual(status, 400)
        self.assertNotIn('"mode": "ai"', raw.decode())

    def test_ai_concurrency_is_bounded(self):
        server.AI_GATE.acquire()
        try:
            status, _, _ = self.request("/api/analyze", {"consent": True, "input": input_data()}, self.auth())
            self.assertEqual(status, 429)
        finally:
            server.AI_GATE.release()

    def test_partial_acquisition_keeps_per_source_failure(self):
        def fetch(url):
            if "fail" in url:
                raise ValueError("blocked")
            return {"title": "岗位", "company": "单位", "rawJD": "公开的岗位要求正文"}
        with patch("server.fetch_page", side_effect=fetch):
            status, _, raw = self.request("/api/fetch-jobs", {"urls": ["https://example.com/ok", "https://example.com/fail"]}, self.auth())
        rows = json.loads(raw)["results"]
        self.assertEqual(status, 200)
        self.assertEqual([r["ok"] for r in rows], [True, False])
        self.assertEqual(rows[1]["url"], "https://example.com/fail")

    def test_local_server_does_not_serve_its_source_or_secrets(self):
        for path in ["/server.py", "/.env", "/.git/config"]:
            status, _, _ = self.request(path)
            self.assertEqual(status, 404)


if __name__ == "__main__":
    unittest.main()
