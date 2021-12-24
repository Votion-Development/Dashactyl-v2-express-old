import Link from 'next/link'
import styles from '../styles/Home.module.css'
import config from "@constants/config";

export default function Home() {
  return (
    <div className={styles.container}>
      <h1>Home Page</h1>
      <Link href="/login">
        <a>login</a>
      </Link>
    </div>
  )
}
