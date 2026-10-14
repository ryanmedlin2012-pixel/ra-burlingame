import ContentPage from '../components/ContentPage';
import styles from '../components/ContentPage.module.css';

const SHOWS = [
  { year: '2024', description: 'The Emotive Power of Color — Van Der Plas Gallery, LES, NYC.' },
  {
    year: '2016',
    description:
      'The Door to the Invisible Must Be Made Visible — Group show curated by Mount Analogue & Megan Harmon, Seattle, WA. Part of Black Box Festival.',
  },
  { year: '1999', description: 'Denise Laws House Party — Salon show, San Francisco, CA.' },
  { year: '1996', description: 'My Favorite Eggplant — Honolulu, HI.' },
  {
    year: '1995',
    description:
      'Curious Arts — Curated by Gaye Chan, Commons Gallery, University of Hawaii at Manoa, Honolulu, HI.',
  },
];

export default function Cv() {
  return (
    <ContentPage title="CV">
      <ul>
        {SHOWS.map((show) => (
          <li key={show.year + show.description}>
            <span className={styles.year}>{show.year}</span>
            <span>{show.description}</span>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
