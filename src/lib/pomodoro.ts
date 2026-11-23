export type PomodoroPhase = 'idle' | 'work' | 'break'

export function nextPomodoroPhase(phase: Exclude<PomodoroPhase, 'idle'>, completedRounds: number, totalRounds: number) {
  if (phase === 'work') return { phase: 'break' as const, completedRounds: completedRounds + 1, completed: false }
  if (completedRounds < totalRounds) return { phase: 'work' as const, completedRounds, completed: false }
  return { phase: 'idle' as const, completedRounds, completed: true }
}
