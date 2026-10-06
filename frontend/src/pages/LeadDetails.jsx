import React, { useEffect, useState } from "react";

import Icon from "../components/Icon";

import { deleteLead, getLeadActivities, updateLead } from "../services/api";

import { getStoredToken } from "../utils/auth";

import { formatMoney, mapLead } from "../utils/leads";



const stages = ["New Lead", "Contacted", "Qualified", "Proposal", "Negotiation", "Won"];



export default function LeadDetails({ lead: incomingLead, onBack, onDeleted }) {

  const [lead, setLead] = useState(incomingLead ? mapLead(incomingLead) : null);

  const [tab, setTab] = useState("Activity Feed");

  const [editing, setEditing] = useState(false);

  const [saving, setSaving] = useState(false);

  const [stageSaving, setStageSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [notes, setNotes] = useState(incomingLead?.notes || "");

  const [message, setMessage] = useState("");

  const [form, setForm] = useState({});

  const [activities, setActivities] = useState([]);

  const [activityLoading, setActivityLoading] = useState(false);

  const [confirmation, setConfirmation] = useState(null);



  useEffect(() => {

    const next = incomingLead ? mapLead(incomingLead) : null;

    setLead(next);

    setNotes(next?.notes || "");

    setForm(next ? makeForm(next) : {});

  }, [incomingLead]);

  const refreshActivities = async (leadId = lead?.id) => {
    const token = getStoredToken();
    if (!token || !leadId) return;

    const data = await getLeadActivities(token, leadId);
    setActivities(data.activities || []);
  };

  useEffect(() => {
    if (!lead?.id) return undefined;

    let active = true;
    setActivityLoading(true);

    getLeadActivities(getStoredToken(), lead.id)
      .then((data) => {
        if (active) setActivities(data.activities || []);
      })
      .catch((error) => {
        if (active) showMessage(error.message || "Unable to load lead activity", true);
      })
      .finally(() => {
        if (active) setActivityLoading(false);
      });

    return () => { active = false; };
  }, [lead?.id]);



  const currentIndex = Math.max(0, stages.indexOf(lead?.status || "New Lead"));

  const initials = (lead?.name || "?").split(/\s+/).filter(Boolean).map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  const owner = lead?.owner || lead?.owner_name || "Unassigned";



  const showMessage = (text, error = false) => {

    setMessage({ text, error });

    window.setTimeout(() => setMessage(""), 2800);

  };



  const save = async (patch = form, close = true) => {

    const token = getStoredToken();

    if (!token) return showMessage("You are not signed in.", true);

    try {

      setSaving(true);

      const data = await updateLead(token, lead.id, normalizePatch(patch));

      const next = mapLead(data.lead);

      setLead(next);

      setNotes(next.notes || "");

      setForm(makeForm(next));

      await refreshActivities(next.id);

      if (close) setEditing(false);

      showMessage("Lead updated successfully");

      return next;

    } catch (err) {

      showMessage(err.message || "Unable to update lead", true);

      throw err;

    } finally {

      setSaving(false);

    }

  };



  const changeStage = async (stage) => {

    if (stage === lead.status || stageSaving) return;

    const token = getStoredToken();

    if (!token) return showMessage("You are not signed in.", true);

    try {

      setStageSaving(true);

      const data = await updateLead(token, lead.id, { status: stage });

      const next = mapLead(data.lead);

      setLead(next);

      setForm(makeForm(next));

      await refreshActivities(next.id);

      showMessage(`Stage changed to ${stage}`);

    } catch (err) {

      showMessage(err.message || "Unable to change stage", true);

    } finally {

      setStageSaving(false);

    }

  };



  const saveNotes = async () => {

    await save({ notes }, false);

  };

  const confirmDelete = async () => {
    const token = getStoredToken();
    if (!token) return showMessage("You are not signed in.", true);

    try {
      setDeleting(true);
      await deleteLead(token, lead.id);
      onDeleted?.();
    } catch (error) {
      showMessage(error.message || "Unable to delete lead", true);
    } finally {
      setDeleting(false);
      setConfirmation(null);
    }
  };

  const confirmAction = async () => {
    if (confirmation?.type === "stage") {
      const stage = confirmation.stage;
      setConfirmation(null);
      await changeStage(stage);
      return;
    }

    if (confirmation?.type === "delete") await confirmDelete();
  };



  if (!lead) return null;



  return (

    <main className="page">

      <div className="lead-details-actions">

        <button className="back-button" onClick={onBack}><Icon>arrow_back</Icon> Leads</button>

        <div className="button-row">

          <button className="secondary-button danger-button" onClick={() => setConfirmation({ type: "delete" })}><Icon>delete</Icon> Delete Lead</button>

          <button className="primary-button" onClick={() => setEditing(true)}><Icon>edit</Icon> Edit Lead</button>

        </div>

      </div>



      <section className="lead-hero panel">

        <div className="lead-identity">

          <div className="hero-avatar">{initials}</div>

          <div>

            <div className="chip-row"><span className="chip blue">{lead.source || "No source"}</span><span className="chip purple">{lead.industry || "Industry not set"}</span><span className="chip red">Score: {lead.lead_score ?? 0}/100</span></div>

            <h1>{lead.name}</h1>

            <p>{lead.email || "No email"} <b>•</b> <span className="accent">{lead.company}</span> <b>•</b> {lead.domain || "No domain"}</p>

          </div>

        </div>

        <div className="financial"><div><small>ESTIMATED PIPELINE VALUE</small><strong>{formatMoney(lead.deal_value)}</strong><span>Deal value</span></div><div className="divider" /><div><small>WIN PROBABILITY</small><strong>{lead.win_probability ?? 0}%</strong><span>Current stage</span></div></div>

      </section>



      <section className="panel pipeline-panel">
        <div className="section-title"><div><div className="eyebrow">LIFECYCLE & PIPELINE STAGE</div><h2>Deal progression</h2></div><span className="live-pill">{stageSaving ? "● Saving" : "● Live"}</span></div>
        <div className="pipeline">
          {stages.map((stage, i) => {
            const done = i < currentIndex || (i === currentIndex && stage === "Won");
            const active = i === currentIndex && stage !== "Won";

            return (
              <button key={stage} type="button" disabled={stageSaving || deleting} className={`stage-card ${done ? "done" : ""} ${active ? "current" : ""}`} onClick={() => stage !== lead.status && setConfirmation({ type: "stage", stage })}>
                <div>
                  <span>{String(i + 1).padStart(2, "0")}. {stage}</span>
                  <Icon>{done ? "check_circle" : active ? "radio_button_checked" : "radio_button_unchecked"}</Icon>
                </div>
                <strong>{done ? "Completed" : active ? "In Progress" : "Upcoming"}</strong>
                <div className="stage-bar"><i style={{ width: done ? "100%" : active ? "75%" : "0%" }} /></div>
              </button>
            );
          })}
        </div>
        <div className="pipeline-hint">Click a stage to review and confirm the change.</div>
      </section>

      <div className="details-grid">

        <section className="panel activity">

          <div className="tabs">

            {[

              ["Activity Feed", "history"],

              ["Notes", "edit_note"],

            ].map(([name, icon]) => <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}><Icon>{icon}</Icon>{name}</button>)}

          </div>

          <div className="activity-body">

            {tab === "Activity Feed" && <>

              <div className="section-title"><div><h2>Recent Activity</h2><p>Stored changes for this lead</p></div></div>

              {activityLoading && <div className="tab-empty"><Icon>sync</Icon><p>Loading activity...</p></div>}

              {!activityLoading && activities.map((activity) => <Activity key={activity.id} title={activity.title} text={activity.description} actor={activity.actor_name} time={activity.created_at} />)}

              {!activityLoading && !activities.length && <div className="tab-empty"><Icon>history</Icon><h2>No activity yet</h2><p>Updates to this lead will appear here.</p></div>}

            </>}



            {tab === "Notes" && <div className="notes-editor">

              <div className="section-title"><div><h2>Lead Notes</h2><p>Write notes and save them directly to PostgreSQL.</p></div></div>

              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add qualification notes, requirements, timeline, pain points..." rows={10} />

              <div className="notes-actions"><span>{notes.length} characters</span><button className="primary-button" onClick={saveNotes} disabled={saving}><Icon>save</Icon>{saving ? "Saving..." : "Save Notes"}</button></div>

            </div>}



          </div>

        </section>



        <aside className="side-stack">

          <div className="panel info-card"><h3><Icon>note</Icon> Account Notes</h3><p>{lead.notes || "No account notes have been recorded for this lead yet."}</p><button className="secondary-button" onClick={() => setTab("Notes")}><Icon>edit</Icon> Edit Notes</button></div>

          <div className="panel info-card"><h3><Icon>person</Icon> Lead Owner</h3><p><strong>{owner}</strong></p></div>

          <div className="panel info-card"><h3><Icon>contact_mail</Icon> Contact</h3><p><strong>{lead.name}</strong></p><p>{lead.email || "No email"}</p>{lead.phone && <p>{lead.phone}</p>}</div>

        </aside>

      </div>



      {editing && <div className="lead-modal-backdrop" onMouseDown={() => !saving && setEditing(false)}>

        <div className="lead-modal edit-lead-modal" onMouseDown={(e) => e.stopPropagation()}>

          <div className="lead-modal-header"><div className="lead-modal-title"><div className="lead-modal-icon"><Icon>edit</Icon></div><div><h2>Edit Lead</h2><p>Every field below is stored in the leads table.</p></div></div><button className="icon-button" type="button" onClick={() => setEditing(false)}><Icon>close</Icon></button></div>

          <form className="lead-modal-form" onSubmit={(e) => { e.preventDefault(); save(); }}>

            <div className="lead-form-grid">

              <label>Name<input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>

              <label>Company<input value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} required /></label>

              <label>Email<input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>

              <label>Phone<input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>

              <label>Domain<input value={form.domain || ""} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></label>

              <label>Industry<input value={form.industry || ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></label>

              <label>Deal Value<input value={form.deal_value ?? ""} onChange={(e) => setForm({ ...form, deal_value: e.target.value })} /></label>

              <label>Source<input value={form.source || ""} onChange={(e) => setForm({ ...form, source: e.target.value })} /></label>

            </div>

            <label className="lead-form-full">Notes<textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={5} /></label>

            <div className="lead-modal-footer"><button className="secondary-button" type="button" onClick={() => setEditing(false)} disabled={saving}>Cancel</button><button className="primary-button" type="submit" disabled={saving}><Icon>save</Icon>{saving ? "Saving..." : "Save Changes"}</button></div>

          </form>

        </div>

      </div>}

      {confirmation && <div className="lead-modal-backdrop" onMouseDown={() => !deleting && !stageSaving && setConfirmation(null)}>
        <div className="lead-modal confirmation-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          <div className="lead-modal-header"><div className="lead-modal-title"><div className="lead-modal-icon"><Icon>{confirmation.type === "delete" ? "warning" : "published_with_changes"}</Icon></div><div><h2>{confirmation.type === "delete" ? "Delete this lead?" : "Change lead stage?"}</h2><p>{confirmation.type === "delete" ? `This permanently deletes ${lead.name} and its activity history.` : `Move ${lead.name} to ${confirmation.stage}?`}</p></div></div></div>
          <div className="confirmation-copy">{confirmation.type === "delete" ? "This action cannot be undone." : "The new stage will be saved to the database and added to Recent Activity."}</div>
          <div className="lead-modal-footer"><button className="secondary-button" type="button" onClick={() => setConfirmation(null)} disabled={deleting || stageSaving}>Cancel</button><button className={confirmation.type === "delete" ? "danger-button" : "primary-button"} type="button" onClick={confirmAction} disabled={deleting || stageSaving}><Icon>{confirmation.type === "delete" ? "delete" : "check"}</Icon>{deleting || stageSaving ? "Saving..." : confirmation.type === "delete" ? "Delete Lead" : "Confirm Change"}</button></div>
        </div>
      </div>}



      {message && <div className={`app-toast ${message.error ? "error-toast" : ""}`}><Icon>{message.error ? "error" : "check_circle"}</Icon>{message.text}</div>}

    </main>

  );

}



function makeForm(lead) {

  return { name: lead.name || "", company: lead.company || "", email: lead.email || "", phone: lead.phone || "", domain: lead.domain || "", industry: lead.industry || "", deal_value: lead.deal_value ?? "", source: lead.source || "", notes: lead.notes || "" };

}



function normalizePatch(patch) {
  const next = { ...patch };
  if (Object.hasOwn(next, "deal_value")) {
    next.deal_value = Number(String(next.deal_value ?? "").replace(/,/g, "")) || 0;
  }
  return next;
}



function Activity({ title, text, actor, time }) {

  return <div className="activity-row"><span className="activity-dot" /><div><strong>{title}</strong><p>{text}{actor ? ` By ${actor}.` : ""}</p></div><time>{new Date(time).toLocaleString()}</time></div>;

}
