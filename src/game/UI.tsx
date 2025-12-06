import { useStore, WEAPONS } from './store'
import type { WeaponType, PowerUpType } from './store'
import { useEffect, useState } from 'react'

// Power-up display info
const POWERUP_INFO: Record<PowerUpType, { emoji: string, name: string, color: string }> = {
  raygun: { emoji: '🔫', name: 'RAY GUN', color: '#9932CC' },
  shield: { emoji: '🛡️', name: 'SHIELD', color: '#00BFFF' },
  speed: { emoji: '🏃', name: 'SPEED', color: '#32CD32' },
  slowmo: { emoji: '⏱️', name: 'SLOW-MO', color: '#FFD700' },
  noreload: { emoji: '♾️', name: 'NO RELOAD', color: '#FF4500' }
}

// High scores helper functions
const getHighScores = (): number[] => {
  try {
    const saved = localStorage.getItem('zombieHighScores')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

const saveHighScore = (score: number): number[] => {
  const scores = getHighScores()
  scores.push(score)
  scores.sort((a, b) => b - a) // Sort descending
  const top3 = scores.slice(0, 3) // Keep only top 3
  localStorage.setItem('zombieHighScores', JSON.stringify(top3))
  return top3
}

export const UI = () => {
  const { health, ammo, score, isGameOver, reset, currentWeapon, kills, unlockedWeapons, isReloading, activePowerUps } = useStore()
  const weaponStats = WEAPONS[currentWeapon]
  const currentAmmo = ammo[currentWeapon]
  const currentKills = kills[currentWeapon]
  const [highScores, setHighScores] = useState<number[]>([])
  const [, forceUpdate] = useState(0)
  
  // Force re-render every 100ms to update power-up timers
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 100)
    return () => clearInterval(interval)
  }, [])
  
  // Load high scores on mount and save when game over
  useEffect(() => {
    setHighScores(getHighScores())
  }, [])
  
  useEffect(() => {
    if (isGameOver && score > 0) {
      const newScores = saveHighScore(score)
      setHighScores(newScores)
    }
  }, [isGameOver, score])

  // Calculate progress to next unlock
  let nextUnlock: WeaponType | null = null
  let progress = 0
  
  if (currentWeapon === 'Pistol' && !unlockedWeapons.includes('SMG')) {
      nextUnlock = 'SMG'
      progress = Math.min(100, (currentKills / WEAPONS.SMG.unlockKills) * 100)
  } else if (currentWeapon === 'SMG' && !unlockedWeapons.includes('Rifle')) {
      nextUnlock = 'Rifle'
      progress = Math.min(100, (currentKills / WEAPONS.Rifle.unlockKills) * 100)
  }

  if (isGameOver) {
      const isNewHighScore = highScores.length > 0 && score >= highScores[highScores.length - 1]
      return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.9)', color: 'white', fontFamily: 'monospace',
            zIndex: 1000
        }}>
            <h1 style={{ fontSize: '48px', margin: '10px' }}>GAME OVER</h1>
            <h2 style={{ fontSize: '32px', margin: '10px' }}>Score: {score}</h2>
            {isNewHighScore && score > 0 && (
              <div style={{ color: '#ffdd00', fontSize: '24px', marginBottom: '20px' }}>
                🏆 NEW HIGH SCORE! 🏆
              </div>
            )}
            
            {/* High Scores */}
            <div style={{ 
              marginTop: '20px', 
              padding: '20px', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '10px',
              minWidth: '200px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>🏆 TOP SCORES 🏆</h3>
              {highScores.length > 0 ? (
                highScores.map((s, i) => (
                  <div key={i} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '5px 10px',
                    background: s === score ? 'rgba(255,221,0,0.3)' : 'transparent',
                    borderRadius: '5px'
                  }}>
                    <span>{i + 1}.</span>
                    <span style={{ color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32' }}>
                      {s}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#888' }}>No scores yet</div>
              )}
            </div>
            
            <button 
                onClick={reset}
                style={{ 
                  padding: '15px 30px', 
                  fontSize: '20px', 
                  cursor: 'pointer',
                  marginTop: '30px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  pointerEvents: 'auto'
                }}
            >
                Try Again
            </button>
        </div>
      )
  }

  // Check if shield is active
  const hasShield = activePowerUps.some(p => p.type === 'shield' && p.expiresAt > Date.now())
  const damageFlash = useStore(state => state.damageFlash)

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {/* Damage Flash Vignette Effect */}
        {damageFlash && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 200px 60px rgba(255, 0, 0, 0.5)',
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255, 0, 0, 0.3) 100%)',
            zIndex: 200,
            animation: 'damageFlash 150ms ease-out'
          }} />
        )}
        
        {/* Shield Vignette Effect */}
        {hasShield && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 150px 30px rgba(0, 191, 255, 0.3)',
            borderRadius: '0',
            zIndex: 100
          }} />
        )}
        
        {/* Crosshair */}
        <div style={{ 
            position: 'absolute', top: '50%', left: '50%', 
            width: '20px', height: '20px', 
            transform: 'translate(-50%, -50%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{ width: '2px', height: '20px', background: 'white' }} />
            <div style={{ width: '20px', height: '2px', background: 'white', position: 'absolute' }} />
        </div>
        
        {/* Reloading Indicator */}
        {isReloading && (
            <div style={{
                position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%, -50%)',
                color: 'yellow', fontFamily: 'monospace', fontSize: '20px', fontWeight: 'bold',
                textShadow: '1px 1px 2px black'
            }}>
                RELOADING...
            </div>
        )}

        {/* HUD */}
        <div style={{ 
            position: 'absolute', bottom: '20px', left: '20px', 
            color: 'white', fontFamily: 'monospace', fontSize: '24px',
            textShadow: '1px 1px 2px black'
        }}>
            <div style={{ color: health < 30 ? 'red' : 'white' }}>Health: {health}</div>
            <div>Score: {score}</div>
        </div>
        
        {/* Active Power-ups */}
        {activePowerUps.length > 0 && (
          <div style={{
            position: 'absolute', top: '20px', left: '20px',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            {activePowerUps.filter(p => p.expiresAt > Date.now()).map(powerUp => {
              const info = POWERUP_INFO[powerUp.type]
              const timeLeft = Math.max(0, Math.ceil((powerUp.expiresAt - Date.now()) / 1000))
              // Duration: raygun=30s, slowmo=20s, noreload=45s, others=30s
              const totalTime = powerUp.type === 'raygun' ? 30 : powerUp.type === 'slowmo' ? 20 : powerUp.type === 'noreload' ? 45 : 30
              const percentLeft = (timeLeft / totalTime) * 100
              
              return (
                <div key={powerUp.type} style={{
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: `2px solid ${info.color}`,
                  fontFamily: 'monospace',
                  minWidth: '140px'
                }}>
                  <div style={{ 
                    color: info.color, 
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginBottom: '4px'
                  }}>
                    {info.emoji} {info.name}
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#333',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percentLeft}%`,
                      height: '100%',
                      background: info.color,
                      transition: 'width 0.1s linear'
                    }} />
                  </div>
                  <div style={{ 
                    color: '#fff', 
                    fontSize: '12px',
                    marginTop: '2px',
                    textAlign: 'right'
                  }}>
                    {timeLeft}s
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Weapon Info */}
        <div style={{
            position: 'absolute', bottom: '20px', right: '20px',
            textAlign: 'right', color: 'white', fontFamily: 'monospace', fontSize: '24px',
            textShadow: '1px 1px 2px black'
        }}>
            {activePowerUps.some(p => p.type === 'raygun' && p.expiresAt > Date.now()) ? (
              <>
                <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#9932CC', textShadow: '0 0 10px #FF00FF' }}>
                  🔫 RAY GUN
                </div>
                <div style={{ color: '#FF00FF' }}>∞ / ∞</div>
              </>
            ) : (
              <>
            <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{currentWeapon}</div>
            <div style={{ color: currentAmmo < 5 ? 'red' : 'white' }}>
                {currentAmmo} / {weaponStats.magSize}
            </div>
              </>
            )}
            
            {/* Kill Tracker / Unlock Progress */}
            {nextUnlock && (
                <div style={{ fontSize: '16px', marginTop: '10px', color: '#aaa' }}>
                    Next Unlock: {nextUnlock}
                    <div style={{ width: '100%', height: '5px', background: '#333', marginTop: '5px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'orange' }} />
                    </div>
                    {currentKills} / {WEAPONS[nextUnlock].unlockKills} Kills
                </div>
            )}
        </div>
        
        <div style={{
            position: 'absolute', top: '20px', right: '20px',
            color: 'white', fontFamily: 'monospace',
            textAlign: 'right',
            fontSize: '14px',
            lineHeight: '1.8'
        }}>
            <div style={{ marginBottom: '5px' }}>
              [1] Pistol 
            <span style={{ color: unlockedWeapons.includes('SMG') ? 'white' : 'gray' }}> [2] SMG </span>
            <span style={{ color: unlockedWeapons.includes('Rifle') ? 'white' : 'gray' }}> [3] Rifle </span>
            </div>
            <div style={{ color: '#aaa' }}>
              [WASD] Move · [R] Reload · [SPACE] Jump
            </div>
        </div>
    </div>
  )
}
