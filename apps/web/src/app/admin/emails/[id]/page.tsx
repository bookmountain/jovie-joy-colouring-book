"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  adminGetEmailCampaign,
  adminPreviewEmailCampaign,
  adminRestoreEmailCampaign,
  adminSendEmailCampaign,
  adminSkipEmailCampaign,
  adminTestEmailCampaign,
  adminUpdateEmailCampaign,
  type EmailCampaignContent,
  type EmailCampaignDetail,
  type EmailCampaignPreview,
} from "@/lib/adminApi";
import {
  AdminBadge,
  AdminButton,
  AdminConfirmDialog,
  AdminField,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "@/components/admin/ui";
import { notifyError } from "@/lib/toast";
import { useAdminAuth } from "@/state/admin-auth";

const SENDING_POLL_MS = 3000;

const contentOf = (campaign: EmailCampaignDetail): EmailCampaignContent => ({
  subject: campaign.subject,
  preheader: campaign.preheader,
  headline: campaign.headline,
  body: campaign.body,
  buttonLabel: campaign.buttonLabel,
});

const plural = (count: number) => `${count} ${count === 1 ? "person" : "people"}`;

export default function EmailReviewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { user } = useAdminAuth();
  const [campaign, setCampaign] = useState<EmailCampaignDetail | null>(null);
  const [preview, setPreview] = useState<EmailCampaignPreview | null>(null);
  const [form, setForm] = useState<EmailCampaignContent | null>(null);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextCampaign, nextPreview] = await Promise.all([
      adminGetEmailCampaign(id),
      adminPreviewEmailCampaign(id),
    ]);
    setCampaign(nextCampaign);
    setPreview(nextPreview);
    setForm(contentOf(nextCampaign));
  }, [id]);

  useEffect(() => {
    if (id) load().catch((reason: Error) => setError(reason.message));
  }, [id, load]);

  useEffect(() => {
    if (user?.email) setTestTo((current) => current || user.email);
  }, [user?.email]);

  const status = campaign?.status;
  useEffect(() => {
    if (status !== "Sending") return;
    const timer = window.setInterval(() => {
      adminGetEmailCampaign(id).then(setCampaign).catch(() => { /* next poll retries */ });
    }, SENDING_POLL_MS);
    return () => window.clearInterval(timer);
  }, [id, status]);

  if (error) return <p role="alert" className="text-cocoa-coral">{error}</p>;
  if (!campaign || !form) return <div className="p-8 text-cocoa-muted">Loading…</div>;

  const isDraft = campaign.status === "Draft";
  const dirty = JSON.stringify(form) !== JSON.stringify(contentOf(campaign));
  const canSend = isDraft && campaign.itemLive && campaign.subscriberCount > 0;
  const update = (patch: Partial<EmailCampaignContent>) => setForm({ ...form, ...patch });

  /** Everything that previews or sends goes through here, so what is reviewed is what goes out. */
  async function saveIfNeeded() {
    if (!dirty || !form) return;
    setCampaign(await adminUpdateEmailCampaign(id, form));
    setPreview(await adminPreviewEmailCampaign(id));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); }
    catch (reason) { notifyError(reason); }
    finally { setBusy(false); }
  }

  const save = () => run(async () => {
    await saveIfNeeded();
    toast.success("Saved. The preview is up to date.");
  });

  const sendTest = () => run(async () => {
    await saveIfNeeded();
    await adminTestEmailCampaign(id, testTo.trim());
    toast.success(`Test sent to ${testTo.trim()}`);
  });

  const skip = () => run(async () => {
    setCampaign(await adminSkipEmailCampaign(id));
    toast.success("Skipped. This email won't go out.");
  });

  const restore = () => run(async () => {
    setCampaign(await adminRestoreEmailCampaign(id));
  });

  async function confirmSend() {
    try {
      await saveIfNeeded();
      const { recipientCount } = await adminSendEmailCampaign(id);
      setConfirmingSend(false);
      toast.success(`Sending to ${plural(recipientCount)}`);
      await load();
    } catch (reason) {
      setConfirmingSend(false);
      notifyError(reason);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        crumb={<Link href="/admin/emails">Emails</Link>}
        title={campaign.itemTitle}
        subtitle={campaign.kind === "Freebie" ? "New freebie" : "New product"}
        actions={isDraft ? (
          <>
            <AdminButton variant="ghost" onClick={skip} disabled={busy}>Skip this one</AdminButton>
            <AdminButton onClick={() => setConfirmingSend(true)} disabled={busy || !canSend}>
              Send to {plural(campaign.subscriberCount)}
            </AdminButton>
          </>
        ) : campaign.status === "Skipped" ? (
          <AdminButton variant="ghost" onClick={restore} disabled={busy}>Move back to review</AdminButton>
        ) : null}
      />

      {isDraft && !campaign.itemLive ? (
        <p role="alert" className="text-cocoa-coral">
          This item isn&apos;t live on the site, so the email can&apos;t be sent yet.
        </p>
      ) : null}
      {isDraft && campaign.subscriberCount === 0 ? (
        <p role="alert" className="text-cocoa-coral">Nobody has subscribed yet.</p>
      ) : null}

      {campaign.status === "Sending" || campaign.status === "Sent" ? (
        <AdminPanel sectionTag="Delivery">
          <p className="flex items-center gap-3">
            <AdminBadge variant={campaign.status === "Sent" ? "pub" : "scheduled"}>{campaign.status}</AdminBadge>
            <span>
              Reached {campaign.sentCount} of {campaign.recipientCount}.
              {campaign.failedCount > 0 ? ` ${campaign.failedCount} couldn't be delivered.` : ""}
              {campaign.skippedCount > 0 ? ` ${campaign.skippedCount} unsubscribed first.` : ""}
            </span>
          </p>
          <p className="mt-2 text-sm text-cocoa-muted">
            Each item only goes out once. Editing the product won&apos;t send this again.
          </p>
        </AdminPanel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <AdminPanel
            sectionTag="Email"
            hint={isDraft
              ? "We wrote this for you. Change anything you like. The picture and price come from the item."
              : "This email is locked."}
          >
            <div className="space-y-4">
              <AdminField>
                <AdminLabel htmlFor="email-subject">Subject</AdminLabel>
                <AdminInput
                  id="email-subject" value={form.subject} maxLength={200} disabled={!isDraft}
                  onChange={(event) => update({ subject: event.target.value })}
                />
              </AdminField>
              <AdminField>
                <AdminLabel htmlFor="email-preheader" hint="the grey text after the subject in an inbox">
                  Preview text
                </AdminLabel>
                <AdminInput
                  id="email-preheader" value={form.preheader} maxLength={300} disabled={!isDraft}
                  onChange={(event) => update({ preheader: event.target.value })}
                />
              </AdminField>
              <AdminField>
                <AdminLabel htmlFor="email-headline">Headline</AdminLabel>
                <AdminInput
                  id="email-headline" value={form.headline} maxLength={200} disabled={!isDraft}
                  onChange={(event) => update({ headline: event.target.value })}
                />
              </AdminField>
              <AdminField>
                <AdminLabel htmlFor="email-body" hint="leave a blank line between paragraphs">Message</AdminLabel>
                <AdminTextarea
                  id="email-body" rows={10} value={form.body} maxLength={5000} disabled={!isDraft}
                  onChange={(event) => update({ body: event.target.value })}
                />
              </AdminField>
              <AdminField>
                <AdminLabel htmlFor="email-button">Button text</AdminLabel>
                <AdminInput
                  id="email-button" value={form.buttonLabel} maxLength={60} disabled={!isDraft}
                  onChange={(event) => update({ buttonLabel: event.target.value })}
                />
              </AdminField>
              {isDraft ? (
                <AdminButton variant="dark" onClick={save} disabled={busy || !dirty}>
                  Save and update preview
                </AdminButton>
              ) : null}
            </div>
          </AdminPanel>

          {isDraft ? (
            <AdminPanel sectionTag="Send yourself a test" hint="Only goes to this address. Nothing is sent to subscribers.">
              <div className="flex flex-wrap gap-2">
                <AdminInput
                  aria-label="Test email address" type="email" className="min-w-0 flex-1"
                  value={testTo} onChange={(event) => setTestTo(event.target.value)}
                />
                <AdminButton variant="ghost" onClick={sendTest} disabled={busy || !testTo.includes("@")}>
                  Send test
                </AdminButton>
              </div>
            </AdminPanel>
          ) : null}
        </div>

        <AdminPanel sectionTag="Preview" hint={preview ? `Subject: ${preview.subject}` : undefined}>
          {dirty ? <p className="mb-2 text-sm text-cocoa-coral">You have unsaved changes. Save to refresh this.</p> : null}
          {preview ? (
            <iframe
              title="Email preview"
              // Empty sandbox: the preview can't run scripts or reach the admin session.
              sandbox=""
              srcDoc={preview.html}
              className="h-[760px] w-full rounded-lg border border-cocoa-line bg-white"
            />
          ) : null}
        </AdminPanel>
      </div>

      <AdminConfirmDialog
        open={confirmingSend}
        title={`Send to ${plural(campaign.subscriberCount)}?`}
        body="This goes out for real and can't be undone. Each item can only be sent once."
        confirmLabel="Yes, send it"
        onConfirm={confirmSend}
        onCancel={() => setConfirmingSend(false)}
      />
    </div>
  );
}
