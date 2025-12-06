import { useEffect, useState, createContext, useContext } from 'react'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

interface ZombieModelData {
  model: THREE.Group | null
  animations: THREE.AnimationClip[]
  isLoading: boolean
}

const ZombieModelContext = createContext<ZombieModelData>({
  model: null,
  animations: [],
  isLoading: true
})

// Preload zombie model and all animations once
export const ZombieModelProvider = ({ children }: { children: React.ReactNode }) => {
  const [model, setModel] = useState<THREE.Group | null>(null)
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loader = new FBXLoader()
    const clips: THREE.AnimationClip[] = []
    
    // Load base model from idle animation (includes mesh)
    loader.load('/zombie_idle.fbx', (fbx) => {
      fbx.scale.setScalar(0.01) // FBX is in cm, convert to meters
      setModel(fbx)
      
      if (fbx.animations.length > 0) {
        const clip = fbx.animations[0].clone()
        clip.name = 'idle'
        clips.push(clip)
      }
      
      // Load other animations
      loader.load('/zombie_attack.fbx', (attackFbx) => {
        if (attackFbx.animations.length > 0) {
          const clip = attackFbx.animations[0].clone()
          clip.name = 'attack'
          clips.push(clip)
        }
        
        loader.load('/zombie_die.fbx', (dieFbx) => {
          if (dieFbx.animations.length > 0) {
            const clip = dieFbx.animations[0].clone()
            clip.name = 'die'
            clips.push(clip)
          }
          
          // Load walk animation
          loader.load('/zombie_walk.fbx', (walkFbx) => {
            if (walkFbx.animations.length > 0) {
              const clip = walkFbx.animations[0].clone()
              clip.name = 'walk'
              clips.push(clip)
            }
            setAnimations([...clips])
            setIsLoading(false)
          }, undefined, (error) => {
            console.warn('Failed to load walk animation:', error)
            // If walk animation doesn't exist, use idle as fallback
            const walkClip = clips.find(c => c.name === 'idle')?.clone()
            if (walkClip) {
              walkClip.name = 'walk'
              clips.push(walkClip)
            }
            setAnimations([...clips])
            setIsLoading(false)
          })
        }, undefined, (error) => {
          console.warn('Failed to load die animation:', error)
          loader.load('/zombie_walk.fbx', (walkFbx) => {
            if (walkFbx.animations.length > 0) {
              const clip = walkFbx.animations[0].clone()
              clip.name = 'walk'
              clips.push(clip)
            }
            setAnimations([...clips])
            setIsLoading(false)
          }, undefined, () => {
            setAnimations([...clips])
            setIsLoading(false)
          })
        })
      }, undefined, (error) => {
        console.warn('Failed to load attack animation:', error)
        loader.load('/zombie_die.fbx', (dieFbx) => {
          if (dieFbx.animations.length > 0) {
            const clip = dieFbx.animations[0].clone()
            clip.name = 'die'
            clips.push(clip)
          }
          loader.load('/zombie_walk.fbx', (walkFbx) => {
            if (walkFbx.animations.length > 0) {
              const clip = walkFbx.animations[0].clone()
              clip.name = 'walk'
              clips.push(clip)
            }
            setAnimations([...clips])
            setIsLoading(false)
          }, undefined, () => {
            setAnimations([...clips])
            setIsLoading(false)
          })
        }, undefined, () => {
          setAnimations([...clips])
          setIsLoading(false)
        })
      })
    }, undefined, (error: unknown) => {
      console.error('Failed to load zombie model:', error)
      setIsLoading(false)
    })
  }, [])

  return (
    <ZombieModelContext.Provider value={{ model, animations, isLoading }}>
      {children}
    </ZombieModelContext.Provider>
  )
}

export const useZombieModel = () => useContext(ZombieModelContext)

