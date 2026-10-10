import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../components/Icon";
import { useAccount } from "../context/AccountContext";
import { getUsers, updateUser } from "../services/api";
import { getStoredToken } from "../utils/auth";
import "../users.css";

const roleLabel = (role) => String(role || "Not recorded").replace(/_/g, " ");
const dateLabel = (date) => date && Number.isFinite(new Date(date).getTime()) ? new Date(date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Never signed in";

export default function Users() {
  const { user: currentUser, can, isUserAdmin } = useAccount();
  const [data, setData] = useState({ users: [], roles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState("");
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setError("");
    try {
      const result = await getUsers(getStoredToken());
      if (current === generation.current) setData(result);
    } catch (err) { if (current === generation.current) setError(err.message || "Unable to load users"); }
    finally { if (current === generation.current) setLoading(false); }
  }, []);
  useEffect(() => { if (isUserAdmin) load(); return () => { generation.current += 1; }; }, [isUserAdmin, load]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(""), 4500); return () => clearTimeout(timeout); }, [toast]);
  useEffect(() => {
    if (!editing) return;
    const handleKey = (event) => { if (event.key === "Escape" && !saving) setEditing(null); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editing, saving]);

  const filtered = useMemo(() => data.users.filter((user) => {
    const text = query.trim().toLowerCase();
    return (!text || `${user.full_name} ${user.email}`.toLowerCase().includes(text)) &&
      (!roleFilter || String(user.role_id) === roleFilter) &&
      (!statusFilter || (statusFilter === "active") === user.is_active);
  }), [data, query, roleFilter, statusFilter]);
  const selectedRole = data.roles.find((role) => role.id === editing?.roleId);
  const self = editing && Number(editing.original.id) === Number(currentUser.id);
  const changes = editing ? {
    ...(editing.roleId !== editing.original.role_id ? { role_id: editing.roleId } : {}),
    ...(editing.isActive !== editing.original.is_active ? { is_active: editing.isActive } : {}),
  } : {};

  const save = async () => {
    if (!Object.keys(changes).length) { setDialogError("There are no changes to save."); return; }
    if (!reviewing) { setReviewing(true); setDialogError(""); return; }
    setSaving(true); setDialogError("");
    try {
      const result = await updateUser(getStoredToken(), editing.original.id, changes);
      setData((current) => ({ ...current, users: current.users.map((user) => user.id === result.user.id ? result.user : user) }));
      setEditing(null); setToast("User access updated successfully.");
      await load();
    } catch (err) { setDialogError(err.message || "Unable to update this user"); }
    finally { setSaving(false); }
  };
  if (!isUserAdmin) return <main className="page"><h1>Access restricted</h1><p>User management is available only to authorized administrators.</p></main>;

  return <main className="page users-page">
    <div className="page-header"><div><div className="eyebrow">ADMINISTRATION</div><h1>Users</h1><p>Manage team access, account roles and active status from one place.</p></div><button className="secondary-button" disabled={loading || saving} onClick={load}><Icon>refresh</Icon>{loading ? "Refreshing…" : "Refresh"}</button></div>
    <div className="users-metrics">{[["Total accounts", data.users.length, "groups"], ["Active accounts", data.users.filter((user) => user.is_active).length, "verified_user"], ["Administrators", data.users.filter((user) => user.role === "admin").length, "admin_panel_settings"], ["Inactive accounts", data.users.filter((user) => !user.is_active).length, "person_off"]].map(([label, value, icon]) => <article key={label}><div><span>{label}</span><Icon>{icon}</Icon></div><strong>{loading && !data.users.length ? "—" : value}</strong></article>)}</div>
    <div className="users-access-note"><Icon>shield</Icon><p>Permissions come from the database role assigned to each account. Deactivation blocks sign-in and existing sessions on their next request; it does not delete leads or history.</p></div>
    {error && <div className="users-error" role="alert">{error} <button className="users-link" onClick={load}>Try again</button></div>}
    <section className="panel users-panel" aria-busy={loading}>
      <div className="users-toolbar"><label className="users-search"><span className="users-visually-hidden">Search users</span><Icon>search</Icon><input type="search" placeholder="Search by name or email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Role<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="">All roles</option>{data.roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}</select></label><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All accounts</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label><button className="users-link" disabled={!query && !roleFilter && !statusFilter} onClick={() => { setQuery(""); setRoleFilter(""); setStatusFilter(""); }}>Reset</button></div>
      <div className="users-table-wrap"><table className="users-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Assigned leads</th><th>Last sign-in</th><th>Actions</th></tr></thead><tbody>{filtered.map((user) => <tr key={user.id}><td><div className="users-identity"><span>{user.full_name?.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "?"}</span><div><strong>{user.full_name} {user.id === currentUser.id && <small className="users-you">You</small>}</strong><small>{user.email}</small></div></div></td><td><span className={`users-role ${user.role === "admin" ? "admin" : ""}`}>{roleLabel(user.role)}</span></td><td><span className={`users-status ${user.is_active ? "active" : "inactive"}`}><i />{user.is_active ? "Active" : "Inactive"}</span></td><td>{user.lead_count ?? 0}</td><td>{dateLabel(user.last_login)}</td><td><button className="secondary-button" disabled={loading} aria-label={`Manage ${user.full_name}`} onClick={() => { setEditing({ original: user, roleId: user.role_id, isActive: user.is_active }); setReviewing(false); setDialogError(""); }}><Icon>manage_accounts</Icon>Manage</button></td></tr>)}</tbody></table></div>
      {loading && !data.users.length ? <div className="users-empty" role="status">Loading accounts…</div> : !filtered.length && <div className="users-empty">{data.users.length ? "No users match these filters." : error ? "Account data could not be loaded." : "No accounts found."}</div>}
      <footer className="users-footer"><span>Showing {filtered.length} of {data.users.length} accounts</span><span>Admin access only</span></footer>
    </section>
    {editing && <div className="lead-modal-backdrop" onMouseDown={() => !saving && setEditing(null)}><div className="lead-modal users-modal" role="dialog" aria-modal="true" aria-labelledby="manage-user-heading" onMouseDown={(event) => event.stopPropagation()}>
      <div className="lead-modal-header"><div className="lead-modal-title"><div className="lead-modal-icon"><Icon>manage_accounts</Icon></div><div><h2 id="manage-user-heading">{reviewing ? "Confirm access changes" : "Manage user"}</h2><p>{editing.original.full_name} · {editing.original.email}</p></div></div><button autoFocus className="icon-button" aria-label="Close user dialog" disabled={saving} onClick={() => setEditing(null)}><Icon>close</Icon></button></div>
      <div className="users-modal-body">
        {self && <div className="users-access-note"><Icon>lock</Icon><p>You cannot disable your own account or remove your own administrator role.</p></div>}
        {!reviewing ? <><label>Account role<select disabled={self || !can("manage_roles")} value={editing.roleId} onChange={(event) => { setEditing({ ...editing, roleId: Number(event.target.value) }); setDialogError(""); }}>{data.roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}</select></label><label className="users-active-control"><input type="checkbox" disabled={self} checked={editing.isActive} onChange={(event) => { setEditing({ ...editing, isActive: event.target.checked }); setDialogError(""); }} /><span><strong>Account active</strong><small>Inactive users cannot access the CRM. Their assigned records are preserved.</small></span></label></> : <div className="users-review">{Object.hasOwn(changes, "role_id") && <p><strong>Role:</strong> {roleLabel(editing.original.role)} → {roleLabel(selectedRole?.name)}</p>}{Object.hasOwn(changes, "is_active") && <p><strong>Status:</strong> {editing.original.is_active ? "Active" : "Inactive"} → {editing.isActive ? "Active" : "Inactive"}</p>}<p>These changes take effect on the user’s next API request. {selectedRole?.name === "admin" && Object.hasOwn(changes, "role_id") ? "This grants administrator access, including user management." : "Review the role permissions below before confirming."}</p></div>}
        <div className="users-permissions"><h3>{roleLabel(selectedRole?.name)} permissions</h3><p>{selectedRole?.description}</p><div>{(selectedRole?.permissions || []).map((permission) => <span key={permission}><Icon>check</Icon>{permission.replace(/_/g, " ")}</span>)}</div></div>
        {dialogError && <div className="users-error" role="alert">{dialogError}</div>}
        <div className="lead-modal-footer"><button className="secondary-button" disabled={saving} onClick={() => reviewing ? setReviewing(false) : setEditing(null)}>{reviewing ? "Back" : "Cancel"}</button><button className="primary-button" disabled={saving || !Object.keys(changes).length} onClick={save}><Icon>{reviewing ? "check" : "shield"}</Icon>{saving ? "Saving…" : reviewing ? "Confirm changes" : "Review changes"}</button></div>
      </div>
    </div></div>}
    {toast && <div className="app-toast" role="status"><Icon>check_circle</Icon>{toast}</div>}
  </main>;
}
