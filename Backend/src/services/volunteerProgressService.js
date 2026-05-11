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

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { cleanupsCompleted: count } },
      { new: true }
    );

    const totalCleanups = updatedUser?.cleanupsCompleted ?? (user.cleanupsCompleted + count);

    const volunteer = await Volunteer.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: { user: user._id, isActive: true },
        $set: {
          'stats.totalCleanups': totalCleanups,
          'stats.reportsResolved': totalCleanups,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!volunteer) continue;

    const newBadges = await awardVolunteerBadges(volunteer);
    if (newBadges.length > 0) {
      awardedByVolunteer.push({ uid, badges: newBadges });
    }
  }

  return awardedByVolunteer;
}
