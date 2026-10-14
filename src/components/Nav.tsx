import { NavLink } from 'react-router-dom';
import styles from './Nav.module.css';

const LINKS = [
  { to: '/work', label: 'WORK' },
  { to: '/bio', label: 'BIO' },
  { to: '/statement', label: 'STATEMENT' },
  { to: '/cv', label: 'CV' },
  { to: '/contact', label: 'CONTACT' },
];

export default function Nav() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={styles.brand}>
        RA BURLINGAME
      </NavLink>
      <div className={styles.links}>
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
