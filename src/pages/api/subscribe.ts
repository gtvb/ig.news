import { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '../../services/stripe'
import { query as q } from 'faunadb'
import { fauna } from '../../services/fauna'

import { getSession } from 'next-auth/client'

type User = {
  ref: {
    id: string
  }
  data: {
    stripe_customer_id: string
  }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    const session = await getSession({ req })

    const user = await fauna.query<User>(
      q.Get(
        q.Match(
          q.Index("user_by_email"),
          q.Casefold(session.user.email)
        )
      )
    )

    let customerId = user.data.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email
      })

      await fauna.query(
        q.Update(
          q.Ref(q.Collection("users"), user.ref.id),
          {
            data: {
              stripe_customer_id: customer.id
            }
          }
        )
      )

      customerId = customer.id
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      line_items: [
        { price: "price_1IaV5mCAl66Jt0notVCie1p3", quantity: 1 }
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL
    })

    res.status(200).json({ sessionId: checkoutSession.id })
  } else {
    res.setHeader("Allow", "POST")
    res.status(405).end("Method not allowed")
  }
}
