import Nav from '../components/Nav';
import styles from './Home.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.hero}>
        <img src="/images/splash.jpg" alt="" className={styles.heroImage} />
      </div>
    </div>
  );
}
