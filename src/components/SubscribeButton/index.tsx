import styles from './styles.module.scss'

import { useSession, signIn } from 'next-auth/client'

import { api } from '../../services/api'
import { getStripeJs } from '../../services/stripe-js'

import { useRouter } from 'next/router'

type ButtonProps = {
  priceId: string
}

export function SubscribeButton({ priceId }: ButtonProps) {
  const [session] = useSession() as any
  const { push } = useRouter()

  if (session?.activeSubscription) {
    push("/posts")
  }

  async function handleSubscription() {
    if (!session) {
      signIn("github")
      return
    }

    try {
      const response = await api.post("/subscribe")
      const { sessionId } = response.data

      const stripe = await getStripeJs()
      await stripe.redirectToCheckout({ sessionId })
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <button type="button" className={styles.subscribeButton} onClick={handleSubscription}>
      Subscribe now
    </button>
  )
}
