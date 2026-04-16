"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "@/app/page.module.css";
import { authText } from "@/lib/ui-text";
import { getFriendlyAuthError } from "@/lib/user-facing-errors";
import { getAvatarGradient, getAvatarUrl, getInitials } from "@/lib/utils";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthPanel({
  session,
  onLogout,
}: {
  session: { name: string; email: string; image?: string | null } | null;
  onLogout: () => Promise<void>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nameUpdate, setNameUpdate] = useState("");
  const [emailUpdate, setEmailUpdate] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profilePending, setProfilePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    if (session) {
      setNameUpdate((current) => (current === session.name ? current : session.name ?? ""));
      setEmailUpdate((current) => (current === session.email ? current : session.email ?? ""));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setProfileError(null);
      setProfileStatus(null);
      setAvatarError(null);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setDeleteError(null);
    } else {
      setMode("login");
      setNameUpdate("");
      setEmailUpdate("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setProfileError(null);
      setProfileStatus(null);
      setAvatarError(null);
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setAvatarUrl(null);
      setDeleteError(null);
      setDeletePending(false);
    }
  }, [session]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (session?.image) {
        setAvatarUrl(getAvatarUrl(session.image));
      }
    });

    return () => {
      window.clearTimeout(id);
    };
  }, [session?.image]);

  const deleteAccount = async () => {
    if (!window.confirm("Вы уверены, что хотите удалить аккаунт? Это действие необратимо.")) {
      return;
    }

    setDeletePending(true);
    setDeleteError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Не удалось удалить аккаунт.");
        throw new Error(text || "Не удалось удалить аккаунт.");
      }

      await onLogout();
    } catch (deleteErrorValue) {
      setDeleteError(
        deleteErrorValue instanceof Error
          ? deleteErrorValue.message
          : "Не удалось удалить аккаунт.",
      );
    } finally {
      setDeletePending(false);
    }
  };

  const submitAvatar = async () => {
    setAvatarError(null);

    if (!avatarFile) {
      setAvatarError("Выберите файл аватарки.");
      return;
    }

    setAvatarPending(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const response = await fetch("/api/user-avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Не удалось загрузить аватарку.");
      }

      const data = await response.json().catch(() => null);
      if (data?.imageUrl) {
        const updatedUrl = `${data.imageUrl}${data.imageUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
        setAvatarUrl(updatedUrl);
      }

      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      setProfileStatus("Аватарка обновлена.");
    } catch (uploadError) {
      setAvatarError(uploadError instanceof Error ? uploadError.message : "Ошибка загрузки.");
    } finally {
      setAvatarPending(false);
    }
  };

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (mode === "register" && trimmedName.length < 2) {
      setError("Введите имя длиной хотя бы 2 символа.");
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setError("Введите корректный адрес электронной почты.");
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен содержать не меньше 8 символов.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const path = mode === "login" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
      const payload =
        mode === "login"
          ? { email: trimmedEmail, password }
          : {
              email: trimmedEmail,
              password,
              name: trimmedName,
            };

      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          getFriendlyAuthError(data?.message ?? "Не удалось выполнить запрос", mode),
        );
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка авторизации. Попробуйте ещё раз.",
      );
    } finally {
      setPending(false);
    }
  };

  if (session) {
    return (
      <aside key={"profile-" + (session.name || 'anon')} className={styles.panel}>
        <div className={styles.profileHeader}>
          <div
            className={styles.avatarSmall}
            style={{
              background: avatarUrl ? undefined : getAvatarGradient(`${session.name}-${session.email}`),
            }}
          >
            {avatarUrl ? (
              <Image className={styles.avatarImg} src={avatarUrl} alt={session.name} width={42} height={42} unoptimized />
            ) : (
              getInitials(session.name)
            )}
          </div>
          <div>
            <h2 className={styles.panelTitle}>{session.name}</h2>
            <p className={styles.panelText}>{session.email}</p>
          </div>
        </div>

        <div className={styles.form} style={{ marginTop: 20 }}>
          <label className={styles.panelText} style={{ marginBottom: 8, display: "block" }}>
            Имя
          </label>
          <input
            className={styles.input}
            value={nameUpdate}
            onChange={(event) => setNameUpdate(event.target.value)}
            placeholder="Имя"
          />
          <label className={styles.panelText} style={{ marginBottom: 8, display: "block", marginTop: 12 }}>
            Почта
          </label>
          <input
            className={styles.input}
            value={emailUpdate}
            onChange={(event) => setEmailUpdate(event.target.value)}
            placeholder="email@example.com"
            type="email"
          />
          <label className={styles.panelText} style={{ marginBottom: 8, display: "block", marginTop: 12 }}>
            Текущий пароль
          </label>
          <input
            className={styles.input}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Введите текущий пароль для смены почты или пароля"
            type="password"
          />
          <label className={styles.panelText} style={{ marginBottom: 8, display: "block", marginTop: 12 }}>
            Новый пароль
          </label>
          <input
            className={styles.input}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Оставьте пустым, чтобы не менять"
            type="password"
          />
          <input
            className={styles.input}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Повторите новый пароль"
            type="password"
          />
          {profileError ? <p className={styles.error}>{profileError}</p> : null}
          {profileStatus ? <p className={styles.meta}>{profileStatus}</p> : null}
          <div className={styles.buttonRow}>
            <button
              className={styles.buttonPrimary}
              disabled={profilePending}
              onClick={async () => {
                const trimmedName = nameUpdate.trim();
                const trimmedEmail = emailUpdate.trim().toLowerCase();

                if (trimmedName.length < 2) {
                  setProfileError("Имя должно содержать не меньше 2 символов.");
                  setProfileStatus(null);
                  return;
                }

                if (!emailPattern.test(trimmedEmail)) {
                  setProfileError("Введите корректный адрес электронной почты.");
                  setProfileStatus(null);
                  return;
                }

                if (newPassword && newPassword !== confirmPassword) {
                  setProfileError("Новый пароль и подтверждение не совпадают.");
                  setProfileStatus(null);
                  return;
                }

                if (newPassword && newPassword.length < 8) {
                  setProfileError("Новый пароль должен содержать не меньше 8 символов.");
                  setProfileStatus(null);
                  return;
                }

                setProfilePending(true);
                setProfileError(null);
                setProfileStatus(null);

                try {
                  const payload: Record<string, string> = { name: trimmedName, email: trimmedEmail };

                  if (currentPassword) {
                    payload.currentPassword = currentPassword;
                  }

                  if (newPassword) {
                    payload.newPassword = newPassword;
                  }

                  const response = await fetch("/api/profile", {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify(payload),
                  });

                  if (!response.ok) {
                    const text = await response.text().catch(() => "Ошибка обновления профиля.");
                    throw new Error(text || "Ошибка обновления профиля.");
                  }

                  setProfileStatus("Профиль обновлён.");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  router.refresh();
                } catch (updateError) {
                  setProfileError(updateError instanceof Error ? updateError.message : "Ошибка обновления профиля.");
                } finally {
                  setProfilePending(false);
                }
              }}
              type="button"
            >
              {profilePending ? "Сохранение..." : "Сохранить изменения"}
            </button>
            <button className={styles.buttonGhost} onClick={onLogout} type="button">
              {authText.signOut}
            </button>
            <button
              className={styles.buttonGhost}
              disabled={deletePending}
              onClick={deleteAccount}
              type="button"
              style={{ color: "#c53030", borderColor: "rgba(197, 48, 48, 0.35)" }}
            >
              {deletePending ? "Удаление..." : "Удалить аккаунт"}
            </button>
          </div>
          {deleteError ? <p className={styles.error}>{deleteError}</p> : null}
        </div>

        <div className={styles.form} style={{ marginTop: 28 }}>
          <label className={styles.panelText} style={{ marginBottom: 8, display: "block" }}>
            Аватарка
          </label>
          <input
            className={styles.fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              setAvatarError(null);
              const file = event.target.files?.[0] ?? null;
              setAvatarFile(file);

              if (file) {
                setAvatarPreviewUrl(URL.createObjectURL(file));
              } else {
                setAvatarPreviewUrl(null);
              }
            }}
          />
          {avatarPreviewUrl ? (
            <div className={styles.avatarPreviewWrap} style={{ marginTop: 12 }}>
              <Image
                className={styles.avatarImg}
                src={avatarPreviewUrl}
                alt="Превью аватара"
                width={56}
                height={56}
                unoptimized
              />
            </div>
          ) : null}
          {avatarError ? <p className={styles.error}>{avatarError}</p> : null}
          <div className={styles.buttonRow}>
            <button
              className={styles.buttonSecondary}
              disabled={avatarPending || !avatarFile}
              onClick={submitAvatar}
              type="button"
            >
              {avatarPending ? "Загрузка..." : "Загрузить"}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside key="auth" className={styles.panel}>
      <h2 className={styles.panelTitle}>Вход и регистрация</h2>
      <div className={styles.authTabs}>
        <button
          className={`${styles.tab} ${mode === "login" ? styles.tabActive : ""}`}
          onClick={() => setMode("login")}
          type="button"
        >
          {authText.signInTab}
        </button>
        <button
          className={`${styles.tab} ${mode === "register" ? styles.tabActive : ""}`}
          onClick={() => setMode("register")}
          type="button"
        >
          {authText.signUpTab}
        </button>
      </div>
      <div className={styles.form}>
        {mode === "register" ? (
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={authText.namePlaceholder}
          />
        ) : null}
        <input
          className={styles.input}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={authText.emailPlaceholder}
          type="email"
        />
        <input
          className={styles.input}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={authText.passwordPlaceholder}
          type="password"
        />
        <div className={styles.buttonRow}>
          <button className={styles.buttonPrimary} disabled={pending} onClick={submit} type="button">
            {pending
              ? authText.pending
              : mode === "login"
                ? authText.signInButton
                : authText.signUpButton}
          </button>
        </div>
        <p className={styles.meta}>{authText.passwordHint}</p>
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>
    </aside>
  );
}
