"""Static-entry and optional preview checks: python -m unittest discover -s experiments/chaos-lobby-demo -v."""

from pathlib import Path
import re
import unittest

from app import DEMO_DIRECTORY, create_server


class StaticDemoTests(unittest.TestCase):
    def test_github_pages_entry_points_to_existing_static_page(self):
        entry = (DEMO_DIRECTORY / "index.html").read_text(encoding="utf-8")
        self.assertIn('url=templates/chaos_demo.html', entry)
        self.assertTrue((DEMO_DIRECTORY / "templates/chaos_demo.html").is_file())

    def test_file_preview_needs_no_template_rendering_or_absolute_paths(self):
        page = (DEMO_DIRECTORY / "templates/chaos_demo.html").read_text(encoding="utf-8")
        self.assertIn("EXPERIMENTAL CHAOS LOBBY DEMO", page)
        self.assertNotIn("{{", page)
        scripts = re.findall(r'<script src="([^"]+)"', page)
        self.assertEqual(len(scripts), 2)
        for script in scripts:
            self.assertFalse(script.startswith("/"))
            self.assertTrue((DEMO_DIRECTORY / "templates" / script).is_file())

    def test_browser_has_no_api_fetch_or_secure_context_id_dependency(self):
        browser = (DEMO_DIRECTORY / "static/chaos_demo.js").read_text(encoding="utf-8")
        self.assertNotIn("fetch(", browser)
        self.assertNotIn("crypto.randomUUID", browser)
        self.assertNotIn("/api/", browser)
        self.assertIn("engine.generateRound", browser)
        self.assertIn("engine.validateAssignment", browser)

    def test_optional_preview_is_loopback_and_standard_library_only(self):
        source = (DEMO_DIRECTORY / "app.py").read_text(encoding="utf-8")
        self.assertNotIn("from flask", source)
        self.assertIn("port=8010", source)
        with create_server(port=0) as server:
            self.assertEqual(server.server_address[0], "127.0.0.1")
        self.assertEqual(DEMO_DIRECTORY, Path(__file__).resolve().parent)


if __name__ == "__main__":
    unittest.main()
