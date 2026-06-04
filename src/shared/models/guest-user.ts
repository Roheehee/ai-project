import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, user } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import {
  calculateCreditExpirationTime,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
} from './credit';
import { getSignUser, User } from './user';

const GUEST_USER_COOKIE_NAME = 'picship_guest_user_id';
const GUEST_USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const GUEST_USER_EMAIL_DOMAIN = 'guest.picship.local';

export const DEFAULT_GUEST_INITIAL_CREDITS = 10;
export const DEFAULT_GUEST_INITIAL_CREDITS_VALID_DAYS = 30;

type RequestActor = Awaited<ReturnType<typeof getSignUser>> | User;

function isGuestEmail(email: string) {
  return email.endsWith(`@${GUEST_USER_EMAIL_DOMAIN}`);
}

export async function getGuestUser({
  createIfMissing = false,
}: {
  createIfMissing?: boolean;
} = {}): Promise<User | null> {
  const cookieStore = await cookies();
  const guestUserId = cookieStore.get(GUEST_USER_COOKIE_NAME)?.value?.trim();

  if (guestUserId) {
    const [existingGuest] = await db()
      .select()
      .from(user)
      .where(eq(user.id, guestUserId))
      .limit(1);

    if (existingGuest && isGuestEmail(existingGuest.email)) {
      return existingGuest;
    }
  }

  if (!createIfMissing) {
    return null;
  }

  const guestUserIdToCreate = getUuid();
  const locale = cookieStore.get('NEXT_LOCALE')?.value?.slice(0, 20) || '';
  const guestEmail = `guest-${guestUserIdToCreate}@${GUEST_USER_EMAIL_DOMAIN}`;
  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: DEFAULT_GUEST_INITIAL_CREDITS_VALID_DAYS,
  });

  const [createdGuest] = await db().transaction(async (tx: any) => {
    const [createdUser] = await tx
      .insert(user)
      .values({
        id: guestUserIdToCreate,
        name: 'Guest User',
        email: guestEmail,
        emailVerified: true,
        utmSource: 'guest',
        locale,
      })
      .returning();

    await tx.insert(credit).values({
      id: getUuid(),
      userId: createdUser.id,
      userEmail: createdUser.email,
      orderNo: '',
      subscriptionNo: '',
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.GRANT,
      transactionScene: CreditTransactionScene.GIFT,
      credits: DEFAULT_GUEST_INITIAL_CREDITS,
      remainingCredits: DEFAULT_GUEST_INITIAL_CREDITS,
      description: 'Guest trial credits',
      expiresAt,
      status: CreditStatus.ACTIVE,
    });

    return [createdUser];
  });

  cookieStore.set(GUEST_USER_COOKIE_NAME, createdGuest.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_USER_COOKIE_MAX_AGE,
  });

  return createdGuest;
}

export async function getRequestUserOrGuest({
  createGuest = false,
}: {
  createGuest?: boolean;
} = {}): Promise<{ user: RequestActor | null; isGuest: boolean }> {
  const signedUser = await getSignUser();
  if (signedUser) {
    return { user: signedUser, isGuest: false };
  }

  const guestUser = await getGuestUser({ createIfMissing: createGuest });
  return { user: guestUser, isGuest: !!guestUser };
}
