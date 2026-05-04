export const metadata = {
  title: "Delete your Limelii account",
  description: "How to delete your Limelii account and what happens to your data.",
};

export default function DeleteAccountPage() {
  return (
    <main style={{
      maxWidth: 720,
      margin: "0 auto",
      padding: "2.5rem 1.5rem 4rem",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#101828",
      lineHeight: 1.6,
    }}>
      <h1 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "1rem" }}>
        Delete your Limelii account
      </h1>

      <p style={{ fontSize: "1rem", color: "#475467", marginBottom: "2rem" }}>
        You can delete your Limelii account and associated data at any time.
        Below are the steps to request deletion and details about what data is
        removed or retained.
      </p>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "2rem", marginBottom: "0.75rem" }}>
        Option 1: Delete from inside the app
      </h2>
      <ol style={{ paddingLeft: "1.25rem", marginBottom: "1.5rem" }}>
        <li>Open the Limelii app on your phone</li>
        <li>Sign in if you aren&apos;t already</li>
        <li>Tap <strong>Profile</strong> in the bottom navigation</li>
        <li>Scroll to <strong>Account Settings</strong></li>
        <li>Tap <strong>Delete Account</strong> under the &ldquo;Danger Zone&rdquo; section</li>
        <li>Confirm the deletion</li>
      </ol>
      <p style={{ marginBottom: "1.5rem" }}>
        Your account and associated data will be deleted immediately.
      </p>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "2rem", marginBottom: "0.75rem" }}>
        Option 2: Request deletion by email
      </h2>
      <p style={{ marginBottom: "0.75rem" }}>
        If you cannot access the app or prefer to request deletion by email,
        contact us at{" "}
        <a href="mailto:hello@limelii.com?subject=Account%20deletion%20request" style={{ color: "#FB6983", textDecoration: "underline" }}>
          hello@limelii.com
        </a>{" "}
        from the email address associated with your account. Include the subject
        line &ldquo;Account deletion request&rdquo;.
      </p>
      <p style={{ marginBottom: "1.5rem" }}>
        We will process your request within 7 business days and confirm by email
        once the deletion is complete.
      </p>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "2rem", marginBottom: "0.75rem" }}>
        What data is deleted
      </h2>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1.5rem" }}>
        <li>Your profile (name, username, email, profile photo, bio)</li>
        <li>Your saved experiences and collections</li>
        <li>Collections you created</li>
        <li>Comments you posted</li>
        <li>Your authentication credentials (Kinde session, OAuth tokens)</li>
        <li>Analytics identifiers tied to your account in Mixpanel</li>
      </ul>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "2rem", marginBottom: "0.75rem" }}>
        What data may be retained
      </h2>
      <p style={{ marginBottom: "0.75rem" }}>
        Some data may be retained for a limited time after deletion for legal,
        security, or operational reasons:
      </p>
      <ul style={{ paddingLeft: "1.25rem", marginBottom: "1.5rem" }}>
        <li>
          <strong>Anonymized usage logs</strong> (no longer linked to your
          account): retained for up to 90 days for security and abuse
          prevention.
        </li>
        <li>
          <strong>Backups</strong>: data may persist in encrypted backups for up
          to 30 days before being permanently overwritten.
        </li>
        <li>
          <strong>Records required by law</strong>: any data we are legally
          required to retain (e.g., for tax or compliance purposes) will be
          kept for the minimum period required.
        </li>
      </ul>

      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "2rem", marginBottom: "0.75rem" }}>
        Questions?
      </h2>
      <p style={{ marginBottom: "1.5rem" }}>
        If you have any questions about account deletion or your data, contact{" "}
        <a href="mailto:hello@limelii.com" style={{ color: "#FB6983", textDecoration: "underline" }}>
          hello@limelii.com
        </a>
        . You can also review our{" "}
        <a href="/privacy" style={{ color: "#FB6983", textDecoration: "underline" }}>
          Privacy Policy
        </a>{" "}
        for details on how we collect and use your data.
      </p>

      <hr style={{ marginTop: "3rem", marginBottom: "1.5rem", border: "none", borderTop: "1px solid #EAECF0" }} />
      <p style={{ fontSize: "0.875rem", color: "#667085" }}>
        Limelii — your guide to NYC experiences.
      </p>
    </main>
  );
}
