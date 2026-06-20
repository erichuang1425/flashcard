import { db } from '../services/firebase';
import { 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  setDoc, 
  updateDoc, 
  increment,
  Timestamp,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import type { Achievement, UserAchievement, DailyChallenge, LevelSystem } from '../types/gamification';
import { isoDate } from '../utils/study-stats';

const LEVELS_CONFIG = {
  BASE_XP: 100,
  GROWTH_FACTOR: 1.5
};

export const getRequiredXP = (level: number): number => {
  return Math.floor(LEVELS_CONFIG.BASE_XP * Math.pow(LEVELS_CONFIG.GROWTH_FACTOR, level - 1));
};

/** The stats a brand-new player starts with before earning any XP. */
export const initialLevelSystem = (): LevelSystem => ({
  currentLevel: 1,
  currentXP: 0,
  requiredXP: LEVELS_CONFIG.BASE_XP,
  totalXP: 0
});

/**
 * Pure leveling math: apply an XP gain to the given level state and roll the
 * player up through as many levels as the gain unlocks (a single award can
 * cross several level boundaries). Extracted from the Firestore write so the
 * rollover logic can be unit-tested without mocking the database.
 */
export const applyXPGain = (stats: LevelSystem, xpGained: number): LevelSystem => {
  let { currentLevel, currentXP, requiredXP, totalXP } = stats;
  currentXP += xpGained;
  totalXP += xpGained;

  // Level up check — keep rolling while the running XP clears the bar so a
  // large single award can advance multiple levels.
  while (currentXP >= requiredXP) {
    currentXP -= requiredXP;
    currentLevel++;
    requiredXP = getRequiredXP(currentLevel);
  }

  return { currentLevel, currentXP, requiredXP, totalXP };
};

export const updateUserXP = async (userId: string, xpGained: number): Promise<LevelSystem> => {
  const userStatsRef = doc(db, 'users', userId, 'stats', 'gamification');

  try {
    // Read-modify-write inside a transaction so concurrent awards (e.g. a
    // session bonus and an achievement bonus) can't clobber each other's XP.
    return await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(userStatsRef);

      // Initialize default stats if none exist
      const currentStats: LevelSystem = statsDoc.exists()
        ? statsDoc.data() as LevelSystem
        : initialLevelSystem();

      const newStats = applyXPGain(currentStats, xpGained);

      // Merge so unrelated fields on the stats doc aren't clobbered
      transaction.set(userStatsRef, newStats, { merge: true });
      return newStats;
    });
  } catch (error) {
    console.error('Error updating XP:', error);
    throw error;
  }
};

// Add achievement types and helpers
type AchievementStats = {
  studySessions: number;
  cardsMastered: number;
  studyTime: number;
  averageAccuracy: number;
  perfectSessions: number;
};

const calculateAchievementProgress = (
  achievement: Achievement, 
  stats: AchievementStats
): number => {
  switch (achievement.type) {
    case 'streak':
      return stats.studySessions;
    case 'cards_mastered':
      return stats.cardsMastered;
    case 'study_time':
      return stats.studyTime;
    case 'accuracy':
      return stats.averageAccuracy;
    case 'perfect_sessions':
      return stats.perfectSessions;
    default:
      return 0;
  }
};

export const loadUserAchievements = async (userId: string): Promise<UserAchievement[]> => {
  const achievementsRef = collection(db, 'users', userId, 'achievements');
  const snapshot = await getDocs(achievementsRef);
  return snapshot.docs.map(doc => doc.data() as UserAchievement);
};

// Add more complete achievement templates
const ACHIEVEMENT_TEMPLATES: Achievement[] = [
  {
    id: 'first-study',
    title: 'First Steps',
    description: 'Complete your first study session',
    icon: '🎯',
    requirement: 1,
    type: 'study_time',
    tier: 'bronze',
    points: 50
  },
  {
    id: 'mastery-beginner',
    title: 'Beginner Master',
    description: 'Master 10 cards',
    icon: '🌟',
    requirement: 10,
    type: 'cards_mastered',
    tier: 'bronze',
    points: 100
  },
  {
    id: 'perfect-streak',
    title: 'Perfect Streak',
    description: 'Get 5 perfect study sessions in a row',
    icon: '🔥',
    requirement: 5,
    type: 'perfect_sessions',
    tier: 'silver',
    points: 200
  }
];

// Replace existing checkAndUpdateAchievements function
export const checkAndUpdateAchievements = async (userId: string, stats: AchievementStats) => {
  const userAchievementsRef = collection(db, 'users', userId, 'achievements');
  
  for (const template of ACHIEVEMENT_TEMPLATES) {
    const achievementRef = doc(userAchievementsRef, template.id);
    const achievementDoc = await getDoc(achievementRef);
    
    const wasAchieved = achievementDoc.exists() && achievementDoc.data().achieved === true;

    if (!wasAchieved) {
      const progress = calculateAchievementProgress(template, stats);
      const nowAchieved = progress >= template.requirement;

      await setDoc(achievementRef, {
        ...template,
        progress,
        achieved: nowAchieved,
        achievedDate: nowAchieved ? new Date() : null
      }, { merge: true });

      // Award XP only on the transition from not-achieved to achieved. The doc
      // may already exist (created earlier with partial progress), so gating on
      // !exists() would never award XP for multi-step achievements.
      if (nowAchieved) {
        await updateUserXP(userId, template.points);
      }
    }
  }
};

// ---------------------------------------------------------------------------
// Daily challenges
// ---------------------------------------------------------------------------

/**
 * What one finished study session contributes toward the day's challenges.
 * `accuracy` is the whole-session percentage (0–100); `studyMinutes` the
 * session length in minutes.
 */
export interface ChallengeEvent {
  cardsReviewed: number;
  accuracy: number;
  studyMinutes: number;
}

interface ChallengeTemplate {
  id: string;
  type: DailyChallenge['type'];
  target: number;
  reward: number;
}

/**
 * The pool three challenges are drawn from each day. Kept small and concrete so
 * the targets are achievable in a single session and the rewards scale with
 * effort. Generation is deterministic per day (see `generateDailyChallenges`),
 * so the same date always yields the same trio.
 */
const CHALLENGE_POOL: ChallengeTemplate[] = [
  { id: 'review-20', type: 'cards_reviewed', target: 20, reward: 30 },
  { id: 'review-40', type: 'cards_reviewed', target: 40, reward: 60 },
  { id: 'study-10', type: 'study_time', target: 10, reward: 30 },
  { id: 'study-20', type: 'study_time', target: 20, reward: 60 },
  { id: 'accuracy-80', type: 'accuracy', target: 80, reward: 40 },
  { id: 'accuracy-90', type: 'accuracy', target: 90, reward: 60 },
];

/** The local-calendar date key (YYYY-MM-DD) a challenge set belongs to. */
export const challengeDateKey = (now: Date = new Date(), timeZone?: string): string =>
  isoDate(now, timeZone);

/**
 * A small deterministic hash of the date key, so a given day always picks the
 * same challenges (idempotent refresh) while different days vary.
 */
const hashDateKey = (dateKey: string): number => {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Pick three distinct challenges for the given day. Pure and deterministic: the
 * date hash seeds a rotation through the pool, and one challenge of each type is
 * preferred so a day's trio covers reviewing, time, and accuracy.
 */
export const generateDailyChallenges = (dateKey: string): DailyChallenge[] => {
  const seed = hashDateKey(dateKey);
  const types: DailyChallenge['type'][] = ['cards_reviewed', 'study_time', 'accuracy'];
  return types.map((type, i) => {
    const ofType = CHALLENGE_POOL.filter((c) => c.type === type);
    const template = ofType[(seed + i) % ofType.length];
    return {
      id: template.id,
      type: template.type,
      target: template.target,
      progress: 0,
      reward: template.reward,
      completed: false,
    };
  });
};

/**
 * Apply a finished session to the day's challenges. Pure — returns a new array.
 * Count/time challenges accumulate toward their target; accuracy challenges
 * record the day's best single-session accuracy. A challenge that reaches its
 * target is marked completed and never regresses.
 */
export const applyChallengeEvent = (
  challenges: DailyChallenge[],
  event: ChallengeEvent
): DailyChallenge[] =>
  challenges.map((challenge) => {
    if (challenge.completed) return challenge;

    let progress = challenge.progress;
    switch (challenge.type) {
      case 'cards_reviewed':
        progress = Math.min(challenge.target, progress + event.cardsReviewed);
        break;
      case 'study_time':
        progress = Math.min(challenge.target, progress + event.studyMinutes);
        break;
      case 'accuracy':
        // Best session accuracy of the day, but only meaningful sessions count
        // toward it — a zero-card session shouldn't bank a 0% attempt.
        if (event.cardsReviewed > 0) progress = Math.max(progress, event.accuracy);
        break;
    }

    return { ...challenge, progress, completed: progress >= challenge.target };
  });

interface StoredChallenges {
  challengesDate?: string;
  dailyChallenges?: DailyChallenge[];
}

const gamificationDocRef = (userId: string) =>
  doc(db, 'users', userId, 'stats', 'gamification');

/**
 * Read the persisted challenges for `dateKey`, or null if none are stored for
 * that day yet (a new day, or a never-initialized account). Challenges live on
 * the gamification stats doc alongside the level system.
 */
export const loadDailyChallenges = async (
  userId: string,
  dateKey: string
): Promise<DailyChallenge[] | null> => {
  const snapshot = await getDoc(gamificationDocRef(userId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as StoredChallenges;
  if (data.challengesDate !== dateKey || !data.dailyChallenges) return null;
  return data.dailyChallenges;
};

/** Persist the day's challenges, merging so the level system is untouched. */
export const saveDailyChallenges = async (
  userId: string,
  dateKey: string,
  challenges: DailyChallenge[]
): Promise<void> => {
  await setDoc(
    gamificationDocRef(userId),
    { challengesDate: dateKey, dailyChallenges: challenges },
    { merge: true }
  );
};

/**
 * Return today's challenges, generating and persisting a fresh set the first
 * time it's asked on a new local day. Idempotent within a day.
 */
export const ensureDailyChallenges = async (
  userId: string,
  now: Date = new Date(),
  timeZone?: string
): Promise<DailyChallenge[]> => {
  const dateKey = challengeDateKey(now, timeZone);
  const existing = await loadDailyChallenges(userId, dateKey);
  if (existing) return existing;

  const fresh = generateDailyChallenges(dateKey);
  await saveDailyChallenges(userId, dateKey, fresh);
  return fresh;
};

/**
 * Record a finished session against today's challenges: generate the set if it
 * doesn't exist, apply the event, award the reward XP for any newly completed
 * challenge, persist, and return the updated set.
 */
export const recordChallengeProgress = async (
  userId: string,
  event: ChallengeEvent,
  now: Date = new Date(),
  timeZone?: string
): Promise<DailyChallenge[]> => {
  const dateKey = challengeDateKey(now, timeZone);
  const before = (await loadDailyChallenges(userId, dateKey)) ?? generateDailyChallenges(dateKey);
  const after = applyChallengeEvent(before, event);

  const reward = after.reduce((sum, challenge, i) => {
    const justCompleted = challenge.completed && !before[i].completed;
    return sum + (justCompleted ? challenge.reward : 0);
  }, 0);

  await saveDailyChallenges(userId, dateKey, after);
  if (reward > 0) await updateUserXP(userId, reward);

  return after;
};