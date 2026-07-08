
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.org_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shares_org_with(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.org_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_org_with(uuid, uuid) TO authenticated;
