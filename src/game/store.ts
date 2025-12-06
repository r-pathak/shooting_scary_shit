import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

// --- Types ---
export type WeaponType = 'Pistol' | 'SMG' | 'Rifle'
export type PowerUpType = 'raygun' | 'shield' | 'speed' | 'slowmo' | 'noreload'

export interface PowerUp {
  id: string
  type: PowerUpType
  position: [number, number, number]
}

export interface HealthPickup {
  id: string
  amount: 20 | 30
  position: [number, number, number]
}

export interface ActivePowerUp {
  type: PowerUpType
  expiresAt: number
}

export interface WeaponStats {
  name: WeaponType
  damage: number
  fireRate: number
  magSize: number
  reloadTime: number
  automatic: boolean
  recoil: number
  unlockKills: number
}

export const WEAPONS: Record<WeaponType, WeaponStats> = {
  Pistol: {
    name: 'Pistol',
    damage: 15,
    fireRate: 400,
    magSize: 12,
    reloadTime: 1000,
    automatic: false,
    recoil: 0.1,
    unlockKills: 0
  },
  SMG: {
    name: 'SMG',
    damage: 8,
    fireRate: 100,
    magSize: 30,
    reloadTime: 1500,
    automatic: true,
    recoil: 0.2,
    unlockKills: 0
  },
  Rifle: {
    name: 'Rifle',
    damage: 20,
    fireRate: 150,
    magSize: 45,
    reloadTime: 2000,
    automatic: true,
    recoil: 0.3,
    unlockKills: 0
  }
}

export interface Enemy {
  id: string
  position: [number, number, number]
  type: 'walker' | 'runner' | 'tank'
  health: number
}

interface GameState {
  health: number
  score: number
  isGameOver: boolean
  isLoading: boolean
  loadingProgress: number
  zombiesReady: boolean
  damageFlash: boolean
  
  currentWeapon: WeaponType
  unlockedWeapons: WeaponType[]
  ammo: Record<WeaponType, number>
  kills: Record<WeaponType, number>
  
  isReloading: boolean
  
  enemies: Enemy[]
  
  // Power-ups
  powerUps: PowerUp[]
  activePowerUps: ActivePowerUp[]
  
  // Health pickups
  healthPickups: HealthPickup[]
  
  decreaseHealth: (amount: number) => void
  addScore: (amount: number) => void
  reset: () => void
  setLoading: (loading: boolean) => void
  setLoadingProgress: (progress: number) => void
  setZombiesReady: (ready: boolean) => void
  triggerDamageFlash: () => void
  
  setWeapon: (weapon: WeaponType) => void
  shootAmmo: () => boolean
  setReloading: (loading: boolean) => void
  reload: () => void
  
  spawnEnemy: () => void
  damageEnemy: (id: string, amount: number) => void
  
  // Power-up actions
  spawnPowerUp: () => void
  collectPowerUp: (id: string) => void
  removePowerUp: (id: string) => void
  hasPowerUp: (type: PowerUpType) => boolean
  cleanExpiredPowerUps: () => void
  
  // Health pickup actions
  spawnHealthPickup: () => void
  collectHealthPickup: (id: string) => void
}

export const useStore = create<GameState>((set, get) => ({
  health: 100,
  score: 0,
  isGameOver: false,
  isLoading: true,
  loadingProgress: 0,
  zombiesReady: false,
  damageFlash: false,
  
  currentWeapon: 'Rifle',
  unlockedWeapons: ['Pistol', 'SMG', 'Rifle'],
  ammo: {
    Pistol: WEAPONS.Pistol.magSize,
    SMG: WEAPONS.SMG.magSize,
    Rifle: WEAPONS.Rifle.magSize
  },
  kills: {
    Pistol: 0,
    SMG: 0,
    Rifle: 0
  },
  
  isReloading: false,
  
  enemies: [],

  // Power-ups
  powerUps: [],
  activePowerUps: [],
  
  // Health pickups
  healthPickups: [],

  decreaseHealth: (amount) => {
    const state = get()
    // Shield blocks all damage
    const hasShield = state.activePowerUps.some(p => p.type === 'shield' && p.expiresAt > Date.now())
    if (hasShield) return
    
    const newHealth = Math.max(0, state.health - amount)
    const gameOver = newHealth <= 0
    
    // Trigger damage flash
    set({ damageFlash: true })
    setTimeout(() => set({ damageFlash: false }), 150)
    
    // Clear everything when game ends to prevent browser lag
    if (gameOver) {
      set({ 
        health: 0, 
        isGameOver: true,
        enemies: [],
        powerUps: [],
        healthPickups: [],
        activePowerUps: []
      })
      return
    }
    
    set({ health: newHealth })
  },

  addScore: (amount) => set((state) => ({ score: state.score + amount })),

  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
  setZombiesReady: (ready) => set({ zombiesReady: ready }),
  triggerDamageFlash: () => {
    set({ damageFlash: true })
    setTimeout(() => set({ damageFlash: false }), 150)
  },

  reset: () => set({ 
    health: 100, 
    score: 0, 
    isGameOver: false, 
    isLoading: false,
    loadingProgress: 0,
    enemies: [],
    currentWeapon: 'Rifle',
    unlockedWeapons: ['Pistol', 'SMG', 'Rifle'],
    ammo: {
      Pistol: WEAPONS.Pistol.magSize,
      SMG: WEAPONS.SMG.magSize,
      Rifle: WEAPONS.Rifle.magSize
    },
    kills: {
        Pistol: 0,
        SMG: 0,
        Rifle: 0
    },
    isReloading: false,
    powerUps: [],
    activePowerUps: [],
    healthPickups: []
  }),

  setWeapon: (weapon) => {
      const { unlockedWeapons, isReloading } = get()
      if (unlockedWeapons.includes(weapon) && !isReloading) {
          set({ currentWeapon: weapon })
      }
  },

  shootAmmo: () => {
    const state = get()
    // No reload power-up = unlimited ammo
    const hasNoReload = state.activePowerUps.some(p => p.type === 'noreload' && p.expiresAt > Date.now())
    if (hasNoReload) {
      return true // Always allow shooting, don't consume ammo
    }
    
    const currentAmmo = state.ammo[state.currentWeapon]
    if (currentAmmo > 0) {
      set((state) => ({
        ammo: { ...state.ammo, [state.currentWeapon]: state.ammo[state.currentWeapon] - 1 }
      }))
      return true
    }
    return false
  },

  setReloading: (loading) => set({ isReloading: loading }),

  reload: () => {
    set((state) => ({
      ammo: { ...state.ammo, [state.currentWeapon]: WEAPONS[state.currentWeapon].magSize },
      isReloading: false
    }))
  },

  spawnEnemy: () => {
    const r = Math.random()
    let type: Enemy['type'] = 'walker'
    let health = 100
    
    if (r > 0.8) { type = 'tank'; health = 300 }
    else if (r > 0.6) { type = 'runner'; health = 50 }

    set((state) => ({
      enemies: [...state.enemies, { 
        id: uuidv4(), 
        // Spawn on ground level (y=0) within bounds: -15 to 15 on X/Z
        position: [(Math.random() - 0.5) * 30, 1.5, (Math.random() - 0.5) * 30],
        type,
        health
      }]
    }))
  },

  damageEnemy: (id, amount) => set((state) => {
    // Find if this enemy will die from this damage
    const targetEnemy = state.enemies.find(e => e.id === id)
    const willDie = targetEnemy && (targetEnemy.health - amount) <= 0
    
    // Update enemy health (keep them even if dead so they can play die animation)
    const updatedEnemies = state.enemies.map(e => 
      e.id === id ? { ...e, health: e.health - amount } : e
    )
    
    if (willDie && targetEnemy) {
       const currentKills = state.kills[state.currentWeapon] + 1
       const newKills = { ...state.kills, [state.currentWeapon]: currentKills }
       const newUnlocked = [...state.unlockedWeapons]
       
       // Score based on enemy type: tank=200, walker=100, runner=50
       const scoreValue = targetEnemy.type === 'tank' ? 200 : (targetEnemy.type === 'runner' ? 50 : 100)

       // Remove the dead enemy after a delay (for die animation)
       setTimeout(() => {
         useStore.setState((s) => ({
           enemies: s.enemies.filter(e => e.id !== id)
         }))
       }, 2000) // 2 seconds for die animation

       return { 
           enemies: updatedEnemies, 
           score: state.score + scoreValue,
           kills: newKills,
           unlockedWeapons: newUnlocked
       }
    }
    
    return { enemies: updatedEnemies }
  }),
  
  // Power-up actions
  spawnPowerUp: () => {
    const types: PowerUpType[] = ['raygun', 'shield', 'speed', 'slowmo', 'noreload']
    const type = types[Math.floor(Math.random() * types.length)]
    
    set((state) => ({
      powerUps: [...state.powerUps, {
        id: uuidv4(),
        type,
        position: [(Math.random() - 0.5) * 40, 1.5, (Math.random() - 0.5) * 40]
      }]
    }))
  },
  
  collectPowerUp: (id) => set((state) => {
    const powerUp = state.powerUps.find(p => p.id === id)
    if (!powerUp) return {}
    
    // Duration in ms
    const durations: Record<PowerUpType, number> = {
      raygun: 30000,    // 30s
      shield: 30000,    // 30s
      speed: 30000,     // 30s
      slowmo: 20000,    // 20s
      noreload: 45000   // 45s
    }
    
    // Only one power-up at a time - replace any existing
    return {
      powerUps: state.powerUps.filter(p => p.id !== id),
      activePowerUps: [
        { type: powerUp.type, expiresAt: Date.now() + durations[powerUp.type] }
      ]
    }
  }),
  
  removePowerUp: (id) => set((state) => ({
    powerUps: state.powerUps.filter(p => p.id !== id)
  })),
  
  hasPowerUp: (type) => {
    const state = get()
    return state.activePowerUps.some(p => p.type === type && p.expiresAt > Date.now())
  },
  
  cleanExpiredPowerUps: () => set((state) => ({
    activePowerUps: state.activePowerUps.filter(p => p.expiresAt > Date.now())
  })),
  
  // Health pickup actions
  spawnHealthPickup: () => {
    const amounts: (20 | 30)[] = [20, 30]
    const amount = amounts[Math.floor(Math.random() * amounts.length)]
    
    set((state) => ({
      healthPickups: [...state.healthPickups, {
        id: uuidv4(),
        amount,
        position: [(Math.random() - 0.5) * 40, 1, (Math.random() - 0.5) * 40]
      }]
    }))
  },
  
  collectHealthPickup: (id) => set((state) => {
    const pickup = state.healthPickups.find(p => p.id === id)
    if (!pickup) return {}
    
    return {
      healthPickups: state.healthPickups.filter(p => p.id !== id),
      health: Math.min(100, state.health + pickup.amount)
    }
  })
}))
