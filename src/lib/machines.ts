import type { TFunction } from 'i18next'
import type { Machine } from './types'

/** Translated display name, e.g. "Lavatrice 1 (interna)" / "Washer 1 (indoor)". */
export function machineName(t: TFunction, machine: Machine): string {
  const type = t(`machineTypes.${machine.type}`)
  const location = t(`locations.${machine.location}`)
  return machine.label
    ? t('machineName.withLabel', { type, label: machine.label, location })
    : t('machineName.withoutLabel', { type, location })
}
