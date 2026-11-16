import { useState } from 'react';
import styles from './Footer.module.css';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // No email service connected yet — this just captures client-side so the
  // form has somewhere to go instead of a dead end. Swap this handler for a
  // real provider call (Mailchimp/ConvertKit/Substack/etc.) when one's set up.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        {submitted ? (
          <span className={styles.label}>THANKS — YOU'RE ON THE LIST</span>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="footer-email">
              NEWSLETTER
            </label>
            <input
              id="footer-email"
              className={styles.input}
              type="email"
              required
              placeholder="email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className={styles.submit}>
              SIGN UP
            </button>
          </form>
        )}

        <p className={styles.copyright}>© 2026 RA Burlingame. All rights reserved.</p>

        <a
          href="https://www.instagram.com/ra_burlingame/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.instagram}
        >
          INSTAGRAM
        </a>
      </div>
    </footer>
  );
}
