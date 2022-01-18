import { defineStore } from "pinia"
import { Ref, ref } from "vue"
import { Profile } from "../skaldstore/dist"
import { doc, getFirestore, getDoc, setDoc, onSnapshot } from '@firebase/firestore'
import { getAuth } from "firebase/auth"
import { logDebug } from "../utils/loghelpers"

export const useProfile = defineStore('profile', () => {
  const profile:Ref<Profile|undefined> = ref(undefined)

  async function enroll () {
    const fbUser = await getAuth().currentUser
    if (!fbUser) throw new Error('No user logged in')
    const p = new Profile(fbUser.uid)
    const data = p.docData
    data.nickname = fbUser.displayName || fbUser.email?.split('@')[0]
    data.avatarURL = fbUser.photoURL || ''
    const profileRef = doc(getFirestore(), 'profiles', fbUser.uid)
    await setDoc(profileRef, data)
  }

  let unsubscribeToProfile:CallableFunction|undefined

  async function initialize (uid: string) {
    unsubscribeToProfile && unsubscribeToProfile()
    const profileRef = doc(getFirestore(), 'profiles', uid)
    const profileDoc = await getDoc(profileRef)
    if (!profileDoc.exists()) {
      await enroll()
    }
    unsubscribeToProfile = onSnapshot(profileRef, async (snapshot) => {
      logDebug('profile', 'snapshot', snapshot.data())
      if (snapshot.exists()) profile.value = new Profile(snapshot.data())
    })
  }

  function $reset () {
    unsubscribeToProfile && unsubscribeToProfile()
    profile.value = undefined
  }

  return {
    $reset,
    initialize
  }
})