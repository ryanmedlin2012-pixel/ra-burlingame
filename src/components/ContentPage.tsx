import type { ReactNode } from 'react';
import Nav from './Nav';
import styles from './ContentPage.module.css';

export default function ContentPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <Nav />
      <main className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
