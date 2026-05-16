export const metadata = {
  title: "Privacy Policy – Daywave",
  description: "How Daywave collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  const updated = "May 16, 2026";

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 text-slate-800">
      <h1 className="text-3xl font-black text-slate-900 mb-1">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-10">Last updated: {updated}</p>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">1. Who We Are</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Daywave ("we", "our", "us") is a travel planning app that helps groups coordinate trips together.
          Our app is available at <a href="https://daywave.app" className="text-sky-600 underline">daywave.app</a> and
          on the Apple App Store. If you have questions about this policy, contact us at{" "}
          <a href="mailto:privacy@daywave.app" className="text-sky-600 underline">privacy@daywave.app</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">2. Information We Collect</h2>
        <ul className="text-sm leading-relaxed text-slate-600 space-y-2 list-disc pl-5">
          <li><strong>Account information:</strong> Your email address and display name, collected when you create an account or sign in.</li>
          <li><strong>Trip content:</strong> Itinerary items, packing lists, reservations, documents, and group chat messages you create within the app.</li>
          <li><strong>Photos:</strong> Images you choose to share in group chat. We only access photos you explicitly select.</li>
          <li><strong>Device information:</strong> Basic technical information (device type, OS version) to ensure the app works correctly.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">3. How We Use Your Information</h2>
        <ul className="text-sm leading-relaxed text-slate-600 space-y-2 list-disc pl-5">
          <li>To create and manage your account.</li>
          <li>To provide the core features of the app — itineraries, group chat, packing lists, and document storage.</li>
          <li>To sync your trip data across your devices and share it with members of your trip group.</li>
          <li>To send transactional emails such as account confirmation and password reset links.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">4. How We Share Your Information</h2>
        <p className="text-sm leading-relaxed text-slate-600 mb-3">
          We do not sell your personal information. We share data only in these limited circumstances:
        </p>
        <ul className="text-sm leading-relaxed text-slate-600 space-y-2 list-disc pl-5">
          <li><strong>With your trip group:</strong> Trip content, your name, and your avatar are visible to other members of trips you join.</li>
          <li><strong>With service providers:</strong> We use Supabase for authentication and data storage. They process data on our behalf under strict confidentiality agreements.</li>
          <li><strong>As required by law:</strong> If required by a valid legal process or to protect the safety of our users.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">5. Data Retention</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          We retain your data for as long as your account is active. You may request deletion of your account
          and all associated data at any time by emailing{" "}
          <a href="mailto:privacy@daywave.app" className="text-sky-600 underline">privacy@daywave.app</a>.
          We will process deletion requests within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">6. Tracking and Analytics</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Daywave does not use third-party advertising networks and does not track you across other apps or
          websites. We do not use your data for targeted advertising.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">7. Children's Privacy</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Daywave is not directed at children under 13. We do not knowingly collect personal information from
          children under 13. If you believe a child under 13 has provided us with personal information, please
          contact us and we will delete it promptly.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">8. Security</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          We use industry-standard security measures including encrypted connections (HTTPS) and secure
          authentication through Supabase. No method of transmission over the internet is 100% secure,
          but we take reasonable steps to protect your information.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">9. Your Rights</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Depending on where you live, you may have rights to access, correct, or delete your personal data.
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:privacy@daywave.app" className="text-sky-600 underline">privacy@daywave.app</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-black text-slate-900 mb-2">10. Changes to This Policy</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          We may update this policy from time to time. We will notify you of significant changes by updating
          the date at the top of this page. Continued use of Daywave after changes are posted constitutes
          acceptance of the updated policy.
        </p>
      </section>

      <p className="text-xs text-slate-400 border-t border-slate-100 pt-6">
        © {new Date().getFullYear()} Daywave. All rights reserved.
      </p>
    </div>
  );
}
