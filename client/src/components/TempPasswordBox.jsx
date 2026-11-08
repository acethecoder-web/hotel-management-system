import { useState } from "react";

function TempPasswordBox({ email, tempPassword, onDismiss }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      setCopied(false); // clipboard blocked: the user can select the text manually
    }
  }

  return (
    <div className="temp-box" role="alert">
      <strong>Temporary password for {email}</strong>
      <code className="temp-box__code">{tempPassword}</code>
      <p>
        This is shown <strong>once</strong>. Give it to the user privately (in
        person or by phone). They must choose a new password at first login. If
        you lose it, reset the password again.
      </p>
      <div className="temp-box__actions">
        <button className="btn btn--primary" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
        <button className="btn btn--outline" onClick={onDismiss}>
          I've saved it, dismiss
        </button>
      </div>
    </div>
  );
}

export default TempPasswordBox;
