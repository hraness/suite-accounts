"use client";

import {
  SUITE_PROFILE_BIO_MAX_LENGTH,
  SUITE_PROFILE_NAME_MAX_LENGTH,
  parseSuiteProfileUpdateRequest,
  type SuiteProfileIssue,
  type SuiteProfileLinkKey,
  type SuiteProfileUpdateRequest,
  type SuiteProfileView,
} from "./identity/profiles.js";
import {
  type FormEvent,
  useId,
  useState,
} from "react";

export type SuiteProfileFormResult =
  | Readonly<{ profile: SuiteProfileView; status: "saved" }>
  | Readonly<{ profile: SuiteProfileView; status: "conflict" }>;

export type SuiteProfileFormProps = Readonly<{
  className?: string;
  initialProfile: SuiteProfileView;
  onSave: (
    request: SuiteProfileUpdateRequest,
  ) => Promise<SuiteProfileFormResult>;
  onSaved?: (profile: SuiteProfileView) => void;
  submitLabel: string;
}>;

type LinkInputs = Record<SuiteProfileLinkKey, string>;
type FieldErrors = Partial<Record<
  SuiteProfileIssue["field"],
  string
>>;

function withoutFieldError(
  errors: FieldErrors,
  field: SuiteProfileIssue["field"],
): FieldErrors {
  const next = { ...errors };
  delete next[field];
  return next;
}

const LINK_FIELDS = [
  ["x", "X"],
  ["linkedin", "LinkedIn"],
  ["bluesky", "BlueSky"],
  ["instagram", "Instagram"],
  ["telegram", "Telegram"],
  ["website", "Personal Website"],
] as const satisfies readonly (readonly [SuiteProfileLinkKey, string])[];

function linkInputs(profile: SuiteProfileView): LinkInputs {
  return {
    bluesky: profile.links.bluesky ?? "",
    instagram: profile.links.instagram ?? "",
    linkedin: profile.links.linkedin ?? "",
    telegram: profile.links.telegram ?? "",
    website: profile.links.website ?? "",
    x: profile.links.x ?? "",
  };
}

function issueMessage(issue: SuiteProfileIssue): string {
  if (issue.field === "name") {
    return issue.reason === "required"
      ? "Enter a name."
      : `Use ${SUITE_PROFILE_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (issue.field === "bio") {
    return `Use ${SUITE_PROFILE_BIO_MAX_LENGTH} characters or fewer.`;
  }
  if (issue.field === "linkedin") return "Enter a LinkedIn profile URL.";
  if (issue.field === "website") return "Enter a complete HTTPS URL.";
  if (
    issue.field === "x"
    || issue.field === "bluesky"
    || issue.field === "instagram"
    || issue.field === "telegram"
  ) {
    const label = LINK_FIELDS.find(([key]) => key === issue.field)?.[1]
      ?? "profile";
    return `Enter a valid ${label} handle or profile URL.`;
  }
  return "Check the profile and try again.";
}

function applyProfile(
  profile: SuiteProfileView,
  setters: Readonly<{
    setBio: (value: string) => void;
    setEmail: (value: string) => void;
    setLinks: (value: LinkInputs) => void;
    setName: (value: string) => void;
    setRevision: (value: number) => void;
  }>,
): void {
  setters.setBio(profile.bio);
  setters.setEmail(profile.email);
  setters.setLinks(linkInputs(profile));
  setters.setName(profile.name);
  setters.setRevision(profile.revision);
}

export function SuiteProfileForm({
  className,
  initialProfile,
  onSave,
  onSaved,
  submitLabel,
}: SuiteProfileFormProps) {
  const id = useId();
  const [name, setName] = useState(initialProfile.name);
  const [email, setEmail] = useState(initialProfile.email);
  const [bio, setBio] = useState(initialProfile.bio);
  const [links, setLinks] = useState<LinkInputs>(() =>
    linkInputs(initialProfile)
  );
  const [revision, setRevision] = useState(initialProfile.revision);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFieldErrors({});
    setFormError(null);
    const parsed = parseSuiteProfileUpdateRequest({
      bio,
      expectedRevision: revision,
      links,
      name,
    });
    if (!parsed.ok) {
      setFieldErrors({
        [parsed.error.field]: issueMessage(parsed.error),
      });
      return;
    }
    setPending(true);
    try {
      const result = await onSave(parsed.value);
      applyProfile(result.profile, {
        setBio,
        setEmail,
        setLinks,
        setName,
        setRevision,
      });
      if (result.status === "conflict") {
        setFormError(
          "The profile changed elsewhere. Review it and save again.",
        );
        return;
      }
      onSaved?.(result.profile);
    } catch {
      setFormError("The profile could not be saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  const formClassName = className === undefined
    ? "suite-profile-form"
    : `suite-profile-form ${className}`;

  return (
    <form
      aria-busy={pending}
      className={formClassName}
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <label className="suite-profile-field" htmlFor={`${id}-name`}>
        <span>Name</span>
        <input
          aria-describedby={
            fieldErrors.name === undefined ? undefined : `${id}-name-error`
          }
          aria-invalid={fieldErrors.name === undefined ? undefined : "true"}
          autoComplete="name"
          disabled={pending}
          id={`${id}-name`}
          maxLength={SUITE_PROFILE_NAME_MAX_LENGTH}
          onChange={(event) => {
            setName(event.currentTarget.value);
            setFieldErrors(errors => withoutFieldError(errors, "name"));
          }}
          required
          type="text"
          value={name}
        />
        {fieldErrors.name === undefined
          ? null
          : (
            <span
              className="suite-profile-error"
              id={`${id}-name-error`}
              role="alert"
            >
              {fieldErrors.name}
            </span>
          )}
      </label>

      <label className="suite-profile-field" htmlFor={`${id}-email`}>
        <span>Email</span>
        <input
          aria-readonly="true"
          autoComplete="email"
          id={`${id}-email`}
          readOnly
          type="email"
          value={email}
        />
      </label>

      <label className="suite-profile-field" htmlFor={`${id}-bio`}>
        <span>Bio</span>
        <textarea
          aria-describedby={
            fieldErrors.bio === undefined ? undefined : `${id}-bio-error`
          }
          aria-invalid={fieldErrors.bio === undefined ? undefined : "true"}
          disabled={pending}
          id={`${id}-bio`}
          maxLength={SUITE_PROFILE_BIO_MAX_LENGTH}
          onChange={(event) => {
            setBio(event.currentTarget.value);
            setFieldErrors(errors => withoutFieldError(errors, "bio"));
          }}
          placeholder="Introduce yourself"
          rows={5}
          value={bio}
        />
        {fieldErrors.bio === undefined
          ? null
          : (
            <span
              className="suite-profile-error"
              id={`${id}-bio-error`}
              role="alert"
            >
              {fieldErrors.bio}
            </span>
          )}
      </label>

      {LINK_FIELDS.map(([key, label]) => {
        const error = fieldErrors[key];
        return (
          <label
            className="suite-profile-field"
            htmlFor={`${id}-${key}`}
            key={key}
          >
            <span>{label}</span>
            <input
              aria-describedby={
                error === undefined ? undefined : `${id}-${key}-error`
              }
              aria-invalid={error === undefined ? undefined : "true"}
              autoCapitalize="none"
              autoComplete="url"
              disabled={pending}
              id={`${id}-${key}`}
              inputMode="url"
              maxLength={2_048}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setLinks(current => ({ ...current, [key]: value }));
                setFieldErrors(errors => withoutFieldError(errors, key));
              }}
              spellCheck={false}
              type="text"
              value={links[key]}
            />
            {error === undefined
              ? null
              : (
                <span
                  className="suite-profile-error"
                  id={`${id}-${key}-error`}
                  role="alert"
                >
                  {error}
                </span>
              )}
          </label>
        );
      })}

      {formError === null
        ? null
        : <p className="suite-profile-error" role="alert">{formError}</p>}
      <button disabled={pending} type="submit">{submitLabel}</button>
    </form>
  );
}
