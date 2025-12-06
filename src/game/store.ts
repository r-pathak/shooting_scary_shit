import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

// --- Types ---
export type WeaponType = 'Pistol' | 'SMG' | 'Rifle'

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
    damage: 25,
    fireRate: 400,
    magSize: 12,
    reloadTime: 1000,
    automatic: false,
    recoil: 0.1,
    unlockKills: 0
  },
  SMG: {
    name: 'SMG',
    damage: 15,
    fireRate: 100,
    magSize: 30,
    reloadTime: 1500,
    automatic: true,
    recoil: 0.2,
    unlockKills: 0
  },
  Rifle: {
    name: 'Rifle',
    damage: 40,
    fireRate: 150,
    magSize: 30,
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
  
  currentWeapon: WeaponType
  unlockedWeapons: WeaponType[]
  ammo: Record<WeaponType, number>
  kills: Record<WeaponType, number>
  
  isReloading: boolean
  
  enemies: Enemy[]
  
  decreaseHealth: (amount: number) => void
  addScore: (amount: number) => void
  reset: () => void
  setLoading: (loading: boolean) => void
  setLoadingProgress: (progress: number) => void
  
  setWeapon: (weapon: WeaponType) => void
  shootAmmo: () => boolean
  setReloading: (loading: boolean) => void
  reload: () => void
  
  spawnEnemy: () => void
  damageEnemy: (id: string, amount: number) => void
}

export const useStore = create<GameState>((set, get) => ({
  health: 100,
  score: 0,
  isGameOver: false,
  isLoading: true,
  loadingProgress: 0,
  
  currentWeapon: 'Pistol',
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

  decreaseHealth: (amount) => set((state) => ({ 
    health: Math.max(0, state.health - amount), 
    isGameOver: state.health - amount <= 0 
  })),

  addScore: (amount) => set((state) => ({ score: state.score + amount })),

  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),

  reset: () => set({ 
    health: 100, 
    score: 0, 
    isGameOver: false, 
    isLoading: false,
    loadingProgress: 0,
    enemies: [],
    currentWeapon: 'Pistol',
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
    isReloading: false
  }),

  setWeapon: (weapon) => {
      const { unlockedWeapons, isReloading } = get()
      if (unlockedWeapons.includes(weapon) && !isReloading) {
          set({ currentWeapon: weapon })
      }
  },

  shootAmmo: () => {
    const state = get()
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
        // Spawn on ground level (y=0) within bounds: -10 to 10 on X/Z
        position: [(Math.random() - 0.5) * 60, 1.5, (Math.random() - 0.5) * 60],
        type,
        health
      }]
    }))
  },

  damageEnemy: (id, amount) => set((state) => {
    const updatedEnemies = state.enemies.map(e => 
      e.id === id ? { ...e, health: e.health - amount } : e
    ).filter(e => e.health > 0)
    
    if (updatedEnemies.length < state.enemies.length) {
       const currentKills = state.kills[state.currentWeapon] + 1
       const newKills = { ...state.kills, [state.currentWeapon]: currentKills }
       
       const newUnlocked = [...state.unlockedWeapons]

       return { 
           enemies: updatedEnemies, 
           score: state.score + 100,
           kills: newKills,
           unlockedWeapons: newUnlocked
       }
    }
    
    return { enemies: updatedEnemies }
  })
}))
