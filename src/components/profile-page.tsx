"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "@/app/page.module.css";
import { AuthPanel } from "@/components/auth-panel";
import { authClient } from "@/lib/auth-client";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export function ProfilePage({ session }: { session: SessionUser | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.refresh();
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <article className={styles.heroCard}>
          <p className={styles.eyebrow}>Профиль</p>
          <h1 className={styles.headline}>Настройки аккаунта</h1>
          <p className={styles.subtext}>
            Здесь можно изменить аватар и управлять аккаунтом. Если вы ещё не вошли, используйте форму для входа.
          </p>
          <div style={{ marginTop: 28 }}>
            <Link className={styles.buttonSecondary} href="/">
              На главную
            </Link>
          </div>
        </article>

        <AuthPanel session={session} onLogout={handleLogout} />
      </div>
    </main>
  );
}
