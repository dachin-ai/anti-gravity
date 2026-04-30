import unittest

from services.auth_logic import normalize_permissions, has_permission, is_permission_enabled


class PermissionParsingTests(unittest.TestCase):
    def test_normalize_permissions_from_json_string(self):
        raw = '{"admin": "1", "price_checker": 1}'
        perms = normalize_permissions(raw)
        self.assertIsInstance(perms, dict)
        self.assertEqual(perms.get("admin"), "1")
        self.assertEqual(perms.get("price_checker"), 1)

    def test_permission_truthy_formats(self):
        self.assertTrue(is_permission_enabled(1))
        self.assertTrue(is_permission_enabled(True))
        self.assertTrue(is_permission_enabled("1"))
        self.assertTrue(is_permission_enabled("true"))
        self.assertFalse(is_permission_enabled(0))
        self.assertFalse(is_permission_enabled("0"))

    def test_has_permission_admin_override(self):
        perms = {"admin": "1", "price_checker": 0}
        self.assertTrue(has_permission(perms, "price_checker"))
        self.assertTrue(has_permission(perms, "order_review"))

    def test_has_permission_specific_tool(self):
        perms = {"admin": 0, "price_checker": "1"}
        self.assertTrue(has_permission(perms, "price_checker"))
        self.assertFalse(has_permission(perms, "order_review"))


if __name__ == "__main__":
    unittest.main()
