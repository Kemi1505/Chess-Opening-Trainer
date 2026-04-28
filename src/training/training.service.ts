export interface SM2Input {
  wasCorrect: boolean
  easeFactor: number   // starts at 2.5, minimum 1.3
  interval: number     // in days, starts at 1
  repetitions: number  // how many times answered correctly in a row
}

export interface SM2Output {
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewAt: Date
}

// Quality score based on whether the answer was correct
// Correct   → quality 4 (good response)
// Incorrect → quality 1 (complete blackout)
function getQuality(wasCorrect: boolean): number {
  return wasCorrect ? 4 : 1
}

export function calculateNextReview(input: SM2Input): SM2Output {
  const { wasCorrect, easeFactor, interval, repetitions } = input
  const quality = getQuality(wasCorrect)

  let newInterval: number
  let newRepetitions: number
  let newEaseFactor: number

  if (wasCorrect) {
    // Correct answer — increase interval based on repetition count
    if (repetitions === 0) {
      newInterval = 1
    } else if (repetitions === 1) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * easeFactor)
    }
    newRepetitions = repetitions + 1
  } else {
    // Wrong answer — reset back to beginning
    newInterval = 1
    newRepetitions = 0
  }

  // Adjust easeFactor based on quality of response
  // Formula from original SM-2 spec
  newEaseFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  // EaseFactor must never drop below 1.3
  newEaseFactor = Math.max(1.3, parseFloat(newEaseFactor.toFixed(2)))

  // Calculate the actual date for next review
  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval)

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewAt,
  }
}