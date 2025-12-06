import { useStore, WEAPONS } from './store'
import type { WeaponType } from './store'

export const UI = () => {
  const { health, ammo, score, isGameOver, reset, currentWeapon, kills, unlockedWeapons, isReloading } = useStore()
  const weaponStats = WEAPONS[currentWeapon]
  const currentAmmo = ammo[currentWeapon]
  const currentKills = kills[currentWeapon]

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
      return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)', color: 'white', fontFamily: 'monospace'
        }}>
            <h1>GAME OVER</h1>
            <h2>Score: {score}</h2>
            <button 
                onClick={reset}
                style={{ padding: '10px 20px', fontSize: '20px', cursor: 'pointer' }}
            >
                Try Again
            </button>
        </div>
      )
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
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
        
        {/* Weapon Info */}
        <div style={{
            position: 'absolute', bottom: '20px', right: '20px',
            textAlign: 'right', color: 'white', fontFamily: 'monospace', fontSize: '24px',
            textShadow: '1px 1px 2px black'
        }}>
            <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{currentWeapon}</div>
            <div style={{ color: currentAmmo < 5 ? 'red' : 'white' }}>
                {currentAmmo} / {weaponStats.magSize}
            </div>
            
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
            textAlign: 'right'
        }}>
            KEYS [1] Pistol 
            <span style={{ color: unlockedWeapons.includes('SMG') ? 'white' : 'gray' }}> [2] SMG </span>
            <span style={{ color: unlockedWeapons.includes('Rifle') ? 'white' : 'gray' }}> [3] Rifle </span>
        </div>
    </div>
  )
}
