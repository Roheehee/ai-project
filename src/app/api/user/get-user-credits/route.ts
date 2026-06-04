import { respData, respErr } from '@/shared/lib/resp';
import { getRemainingCredits } from '@/shared/models/credit';
import { getRequestUserOrGuest } from '@/shared/models/guest-user';

export async function POST(req: Request) {
  try {
    const { user, isGuest } = await getRequestUserOrGuest({
      createGuest: true,
    });
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const credits = await getRemainingCredits(user.id);

    return respData({ remainingCredits: credits, isGuest });
  } catch (e) {
    console.log('get user credits failed:', e);
    return respErr('get user credits failed');
  }
}
