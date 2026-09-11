"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  SUITE_PROFILE_BIO_MAX_LENGTH, SUITE_PROFILE_NAME_MAX_LENGTH,
  SUITE_PROFILE_URL_MAX_LENGTH,
} from "./identity/profiles.js";
import {
  parseSuiteProfileEditorV2, parseSuiteProfileUpdateV2,
  type SuiteProfileEditorV2, type SuiteProfileLinkKeyV2,
  type SuiteProfileUpdateV2, type SuiteProfileV2Issue,
} from "./identity/profiles-v2.js";
import { profileFormClasses as classes } from "./profile-form.stylex.js";
import { parsePublicProfileFormResult } from "./public-profile-form-result.js";

export type { PublicProfileFormResult as SuitePublicProfileFormResult } from "./public-profile-form-result.js";

export type SuitePublicProfileFormProps = Readonly<{
  className?: string;
  /** Initial snapshot. Remount explicitly to replace a same-account draft. */
  initialProfile: SuiteProfileEditorV2;
  /** Captured on mount. The caller owns authenticated transport and session unmount. */
  onSave: (request: SuiteProfileUpdateV2) => Promise<unknown>;
  onSaved?: (profile: SuiteProfileEditorV2) => void;
}>;

type Visibility = SuiteProfileUpdateV2["publication"] | null;
type LinkInputs = Record<SuiteProfileLinkKeyV2, string>;
type FieldErrors = Partial<Record<SuiteProfileV2Issue["field"], string>>;

const LINK_FIELDS = [
  ["x", "X"], ["github", "GitHub"], ["linkedin", "LinkedIn"],
  ["website", "Website"], ["bluesky", "Bluesky"],
  ["instagram", "Instagram"], ["telegram", "Telegram"],
] as const satisfies readonly (readonly [SuiteProfileLinkKeyV2, string])[];

function linkInputs(profile: SuiteProfileEditorV2): LinkInputs {
  return {
    x: profile.links.x ?? "", github: profile.links.github ?? "",
    linkedin: profile.links.linkedin ?? "", website: profile.links.website ?? "",
    bluesky: profile.links.bluesky ?? "", instagram: profile.links.instagram ?? "",
    telegram: profile.links.telegram ?? "",
  };
}

function issueMessage(issue: SuiteProfileV2Issue): string {
  if (issue.field === "name") return issue.reason === "required"
    ? "Enter a public-facing name."
    : `Use ${SUITE_PROFILE_NAME_MAX_LENGTH} characters or fewer.`;
  if (issue.field === "bio") return `Use ${SUITE_PROFILE_BIO_MAX_LENGTH} characters or fewer.`;
  if (issue.field === "publication") return "Choose whether to keep this profile private or publish it.";
  if (issue.field === "github") return "Enter a GitHub profile URL, such as https://github.com/username.";
  if (issue.field === "linkedin") return "Enter a LinkedIn profile URL.";
  if (issue.field === "website") return "Enter a complete HTTPS URL.";
  const label = LINK_FIELDS.find(([key]) => key === issue.field)?.[1];
  return label === undefined ? "Check the profile and try again."
    : `Enter a valid ${label} handle or profile URL.`;
}

/** Optional editor only. The authority authenticates saves and applies consent. */
export function SuitePublicProfileForm(props: SuitePublicProfileFormProps) {
  const parsed = parseSuiteProfileEditorV2(props.initialProfile);
  if (!parsed.ok) {
    return <p className={`suite-profile-error ${classes.error}`} role="alert">The profile is unavailable. Reload the page to try again.</p>;
  }
  return <PublicProfileEditor {...props} initialProfile={parsed.value} key={parsed.value.accountId} />;
}

function PublicProfileEditor({ className, initialProfile, onSave, onSaved }: SuitePublicProfileFormProps) {
  const id = useId();
  const [transport] = useState(() => ({ onSave, onSaved }));
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name);
  const [bio, setBio] = useState(initialProfile.bio);
  const [links, setLinks] = useState(() => linkInputs(initialProfile));
  const [visibility, setVisibility] = useState<Visibility>(initialProfile.publication === "published" ? "publish" : "private");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [conflict, setConflict] = useState<SuiteProfileEditorV2 | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const inFlight = useRef<symbol | null>(null);
  const liveForm = useRef<HTMLFormElement | null>(null);
  const abandoned = useRef(false);
  const nameControl = useRef<HTMLInputElement>(null);
  const focusLoadedProfile = useRef(false);
  // A DOM ref detaches during commit, before a retired transport can resolve
  // in the gap before passive-effect cleanup. Reconnection never resends it.
  const attachForm = useCallback((node: HTMLFormElement | null) => {
    liveForm.current = node;
    if (node === null) {
      if (inFlight.current !== null) abandoned.current = true;
      inFlight.current = null;
    } else if (abandoned.current) {
      abandoned.current = false;
      setPending(false);
      setUnconfirmed(true);
      setFormError("The save could not be confirmed. Your draft is preserved. Try saving again, or reload the profile to check its saved state.");
    }
  }, []);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (focusLoadedProfile.current && conflict === null) {
      focusLoadedProfile.current = false;
      nameControl.current?.focus();
    }
  }, [conflict]);

  function clearField(field: SuiteProfileV2Issue["field"]) {
    setFieldErrors(current => { const next = { ...current }; delete next[field]; return next; });
    setNotice(null);
  }

  function applyProfile(next: SuiteProfileEditorV2, nextVisibility: Visibility) {
    setProfile(next);
    setName(next.name);
    setBio(next.bio);
    setLinks(linkInputs(next));
    setVisibility(nextVisibility);
    setUnconfirmed(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || liveForm.current !== event.currentTarget || inFlight.current !== null || conflict !== null) return;
    setNotice(null);
    setFormError(null);
    setFieldErrors({});
    const parsed = parseSuiteProfileUpdateV2({
      schemaVersion: 2, expectedRevision: profile.revision,
      name, bio, links, avatarRef: profile.avatarRef, publication: visibility,
    });
    if (!parsed.ok) {
      setFieldErrors({ [parsed.error.field]: issueMessage(parsed.error) });
      event.currentTarget.querySelector<HTMLElement>(`[id="${id}-${parsed.error.field}"]`)?.focus();
      return;
    }
    if (parsed.value.publication === "publish" && profile.username === null) {
      setFieldErrors({ publication: "Choose a username in account settings before publishing." });
      return;
    }
    const dispatch = Symbol();
    inFlight.current = dispatch;
    setPending(true);
    let saved: SuiteProfileEditorV2 | null = null;
    try {
      const raw = await transport.onSave(parsed.value);
      if (liveForm.current === null || inFlight.current !== dispatch) return;
      const result = parsePublicProfileFormResult(raw, profile, parsed.value);
      if (result === null) throw new Error("Unconfirmed profile result.");
      if (result.status === "conflict") {
        setConflict(result.profile);
        setVisibility(null);
        setUnconfirmed(false);
        setFormError("This profile changed elsewhere. Your draft is still below. Load the latest profile to replace it, then review visibility before saving.");
      } else if (result.status === "saved") {
        applyProfile(result.profile, result.profile.publication === "published" ? "publish" : "private");
        setNotice(result.profile.publication === "published" ? "Public profile saved." : "Private profile saved.");
        saved = result.profile;
      } else if (result.status === "unauthorized") {
        setFormError("Your account session is unavailable. Sign in again before saving.");
      } else if (result.status === "username_required") {
        setFormError("Choose a username in account settings, then reload this profile before publishing.");
      } else {
        setFormError("Your profile image is unavailable. Reload the profile before saving.");
      }
    } catch {
      if (liveForm.current === null || inFlight.current !== dispatch) return;
      setUnconfirmed(true);
      setFormError("The save could not be confirmed. Your draft is preserved. Try saving again, or reload the profile to check its saved state.");
    } finally {
      if (liveForm.current !== null && inFlight.current === dispatch) {
        inFlight.current = null;
        setPending(false);
      }
    }
    if (saved !== null && liveForm.current !== null) {
      try { transport.onSaved?.(saved); }
      catch {
        if (liveForm.current !== null) setFormError("The profile was saved, but the page could not refresh. Reload the page.");
      }
    }
  }

  const disabled = !ready || pending || conflict !== null;
  const currentProfile = conflict ?? profile;
  const action = pending ? "Saving profile" : visibility === "publish"
    ? profile.publication === "published" ? "Save public profile" : "Publish profile"
    : visibility === "private" && profile.publication === "published"
      ? "Make profile private" : visibility === "private" ? "Save private profile" : "Save profile";
  const formClass = `suite-profile-form suite-public-profile-form ${classes.form}${className === undefined ? "" : ` ${className}`}`;
  const describedBy = (field: SuiteProfileV2Issue["field"]) => fieldErrors[field] === undefined ? undefined : `${id}-${field}-error`;
  const fieldError = (field: SuiteProfileV2Issue["field"]) => fieldErrors[field] === undefined ? null
    : <span className={`suite-profile-error ${classes.error}`} id={`${id}-${field}-error`} role="alert">{fieldErrors[field]}</span>;

  return (
    <form aria-busy={!ready || pending} className={formClass} method="post" onSubmit={event => { void submit(event); }} ref={attachForm}>
      <noscript><p className={classes.note}>Enable JavaScript to edit this profile. No changes can be saved from this form without it.</p></noscript>
      {formError === null ? null : <p className={`suite-profile-error ${classes.error}`} role="alert">{formError}</p>}
      {conflict === null ? null : <button className={classes.button} onClick={() => {
        applyProfile(conflict, null);
        setConflict(null);
        setFieldErrors({});
        setFormError(null);
        setNotice("Latest profile loaded. Choose visibility before saving.");
        focusLoadedProfile.current = true;
      }} type="button">Load latest profile</button>}
      <div className={`suite-profile-field ${classes.field}`}>
        <label className={classes.label} htmlFor={`${id}-name`}>Public-facing name</label>
        <input aria-describedby={describedBy("name")} aria-invalid={fieldErrors.name === undefined ? undefined : true}
          autoComplete="off" className={classes.control} disabled={disabled} id={`${id}-name`}
          maxLength={SUITE_PROFILE_NAME_MAX_LENGTH} onChange={event => { setName(event.currentTarget.value); clearField("name"); }}
          ref={nameControl} required type="text" value={name} />
        {fieldError("name")}
      </div>
      <div className={`suite-profile-field ${classes.field}`}>
        <label className={classes.label} htmlFor={`${id}-bio`}>Bio</label>
        <textarea aria-describedby={describedBy("bio")} aria-invalid={fieldErrors.bio === undefined ? undefined : true}
          className={classes.textarea} disabled={disabled} id={`${id}-bio`} maxLength={SUITE_PROFILE_BIO_MAX_LENGTH}
          onChange={event => { setBio(event.currentTarget.value); clearField("bio"); }} rows={4} value={bio} />
        {fieldError("bio")}
      </div>
      {LINK_FIELDS.map(([key, label]) => <div className={`suite-profile-field ${classes.field}`} key={key}>
        <label className={classes.label} htmlFor={`${id}-${key}`}>{label}</label>
        <input aria-describedby={describedBy(key)} aria-invalid={fieldErrors[key] === undefined ? undefined : true}
          autoCapitalize="none" autoComplete="off" className={classes.control} disabled={disabled} id={`${id}-${key}`}
          inputMode="url" maxLength={SUITE_PROFILE_URL_MAX_LENGTH} onChange={event => {
            const value = event.currentTarget.value;
            setLinks(current => ({ ...current, [key]: value })); clearField(key);
          }} spellCheck={false} type="text" value={links[key]} />
        {fieldError(key)}
      </div>)}
      <fieldset aria-describedby={`${id}-visibility-note${fieldErrors.publication === undefined ? "" : ` ${id}-publication-error`}`}
        aria-invalid={fieldErrors.publication === undefined ? undefined : true}
        className={`suite-profile-visibility ${classes.visibility}`} disabled={disabled} id={`${id}-publication`} tabIndex={-1}>
        <legend className={classes.label}>Profile visibility</legend>
        <p className={classes.note} id={`${id}-visibility-note`}>{unconfirmed ? "Publication status is unconfirmed." : currentProfile.publication === "published"
          ? `The saved profile for @${currentProfile.username} is public.` : "The saved profile is private."} Your choice takes effect when you save.</p>
        <label className={classes.choice}>
          <input checked={visibility === "private"} className={classes.radio} name="publication" onChange={() => { setVisibility("private"); clearField("publication"); }} required type="radio" value="private" />
          <span>Keep private</span>
        </label>
        <label className={classes.choice}>
          <input aria-describedby={`${id}-publication-note`} checked={visibility === "publish"} className={classes.radio}
            disabled={profile.username === null} name="publication" onChange={() => { setVisibility("publish"); clearField("publication"); }} required type="radio" value="publish" />
          <span>Publish profile</span>
        </label>
        <p className={classes.note} id={`${id}-publication-note`}>{profile.username === null ? "Choose a username in account settings before publishing. You can still save privately." : "Anyone can read your published name, bio, social links, and profile image. Your sign-in email is not included."}</p>
        {fieldError("publication")}
      </fieldset>
      <button className={classes.button} disabled={disabled} type="submit">{action}</button>
      <p aria-live="polite" className={classes.note} role="status">{notice}</p>
    </form>
  );
}
