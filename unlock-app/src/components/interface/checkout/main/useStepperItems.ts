// Not sure, here we use checkout and account machines
import { useSelector } from '@xstate/react'
import { StepItem } from '../Stepper'
import { CheckoutMachineContext, CheckoutService } from './checkoutMachine'
import { shouldSkip } from './utils'
import { getHookType } from './checkoutHookUtils'

export function useStepperItems(
  service: CheckoutService,
  {
    isUnlockAccount,
    isRenew,
    existingMember: isExistingMember,
    useDelegatedProvider,
  }: {
    isRenew?: boolean
    isUnlockAccount?: boolean
    existingMember?: boolean
    useDelegatedProvider?: boolean
  } = {}
) {
  const {
    lock,
    paywallConfig,
    skipQuantity,
    skipRecipient,
    existingMember,
    payment,
    renew,
  } = useSelector(service, (state) => state.context) as CheckoutMachineContext

  if (!paywallConfig.locks || Object.keys(paywallConfig.locks).length === 0) {
    return []
  }
  const [address, config] = Object.entries(paywallConfig.locks)[0]
  const hasOneLock = Object.keys(paywallConfig.locks).length === 1
  const lockConfig = {
    address,
    ...config,
  }

  const isExpired = isRenew || renew
  const { skipQuantity: skipLockQuantity, skipRecipient: skipLockRecipient } =
    shouldSkip({
      paywallConfig,
      lock: lockConfig,
    })

  const isPassword = getHookType(lock, paywallConfig) === 'password'
  const isCaptcha = getHookType(lock, paywallConfig) === 'captcha'
  const isPromo = getHookType(lock, paywallConfig) === 'promocode'
  const isGuild = getHookType(lock, paywallConfig) === 'guild'
  const isGitcoin = getHookType(lock, paywallConfig) === 'gitcoin'
  const isMember = existingMember || isExistingMember
  const checkoutItems: StepItem[] = [
    {
      name: 'Select',
      to: 'SELECT',
    },
  ]
  if (!useDelegatedProvider) {
    checkoutItems.push({
      name: 'Connect',
      to: isUnlockAccount ? 'UNLOCK_ACCOUNT' : 'CONNECT',
    })
  }
  checkoutItems.push(
    ...[
      {
        name: 'Choose quantity',
        skip: (!hasOneLock ? skipQuantity : skipLockQuantity) || isExpired,
        to: 'QUANTITY',
      },
      {
        name: 'Recipient(s)',
        to: 'METADATA',
        skip:
          (!hasOneLock
            ? skipRecipient && skipQuantity && !isMember
            : skipLockQuantity && skipLockRecipient && !isMember) || isExpired,
      },
      {
        name: 'Sign message',
        skip: !paywallConfig.messageToSign,
        to: 'MESSAGE_TO_SIGN',
      },
      isPassword
        ? {
            name: 'Submit password',
            to: 'PASSWORD',
          }
        : isPromo
          ? {
              name: 'Enter promo code',
              to: 'PROMO',
            }
          : isGuild
            ? {
                name: 'Guild',
                to: 'GUILD',
              }
            : isGitcoin
              ? {
                  name: 'Gitcoin Passport Verification',
                  to: 'GITCOIN',
                }
              : {
                  name: 'Solve captcha',
                  to: 'CAPTCHA',
                  skip: !isCaptcha,
                },
      {
        name: 'Payment method',
        to: 'PAYMENT',
      },
      {
        name: 'Add card',
        to: 'CARD',
        skip: !['card'].includes(payment?.method),
      },
      {
        name: 'Confirm',
        to: 'CONFIRM',
      },
      {
        name: 'Minting NFT',
      },
    ]
  )

  return checkoutItems
}
