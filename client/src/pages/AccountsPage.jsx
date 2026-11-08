import { useState } from "react";
import UsersTab from "../components/UsersTab";
import AuditLogTab from "../components/AuditLogTab";

const TABS = [
  ["users", "Users"],
  ["audit", "Audit log"],
];

function AccountsPage() {
  const [tab, setTab] = useState("users");

  return (
    <>
      <div className="page-header">
        <h1>Account management</h1>
        <p>Create staff accounts, reset passwords, and review activity.</p>
      </div>

      <div className="chips">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            className={`chip ${tab === key ? "chip--active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "users" ? <UsersTab /> : <AuditLogTab />}
    </>
  );
}

export default AccountsPage;
