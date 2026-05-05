import User from '../models/User.js';
import Volunteer from '../models/Volunteer.js';
import { awardVolunteerBadges } from './badgeService.js';

export async function recordVolunteerResolutions(assignedToUids = []) {
  const countsByUid = new Map();

  assignedToUids.forEach((uid) => {
    if (!uid) return;
    countsByUid.set(uid, (countsByUid.get(uid) ?? 0) + 1);
  });

  if (countsByUid.size === 0) return [];

  const awardedByVolunteer = [];

  for (const [uid, count] of countsByUid.entries()) {
    const user = await User.findOne({ firebaseUid: uid });
    if (!user) continue;

    await User.updateOne(
      { _id: user._id },
      { $inc: { cleanupsCompleted: count } }
    );

    const volunteer = await Volunteer.findOneAndUpdate(
      { user: user._id },
      { $inc: { 'stats.totalCleanups': count, 'stats.reportsResolved': count } },
      { new: true }
    );

    if (!volunteer) continue;

    const newBadges = await awardVolunteerBadges(volunteer);
    if (newBadges.length > 0) {
      awardedByVolunteer.push({ uid, badges: newBadges });
    }
  }

  return awardedByVolunteer;
}
