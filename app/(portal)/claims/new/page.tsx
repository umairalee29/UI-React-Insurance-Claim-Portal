'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { createClaimSchema, CreateClaimInput } from '@/lib/validations'
import { ClaimType, ClaimStatus } from '@/types'
import { StepIndicator } from '@/components/forms/StepIndicator'
import { FileUploadZone } from '@/components/forms/FileUploadZone'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useFileUpload } from '@/hooks/useFileUpload'
import { ClaimStatusBadge } from '@/components/claims/ClaimStatusBadge'
import { ClaimTypeIcon } from '@/components/claims/ClaimTypeIcon'

const STEPS = ['Claim Type', 'Incident Details', 'Documents', 'Review']

const CLAIM_TYPES: { type: ClaimType; label: string; icon: string; description: string }[] = [
  { type: 'auto', label: 'Auto', icon: '🚗', description: 'Vehicle accidents, theft, damage' },
  { type: 'home', label: 'Home', icon: '🏠', description: 'Property damage, theft, disaster' },
  { type: 'health', label: 'Health', icon: '❤️', description: 'Medical expenses, hospitalization' },
  { type: 'life', label: 'Life', icon: '🛡️', description: 'Life insurance benefits' },
  { type: 'travel', label: 'Travel', icon: '✈️', description: 'Trip cancellation, lost luggage' },
]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
}

export default function NewClaimPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [selectedType, setSelectedType] = useState<ClaimType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { files, addFiles, removeFile, uploadAll, isUploading } = useFileUpload()

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<CreateClaimInput>({
    resolver: zodResolver(createClaimSchema),
    defaultValues: { status: 'submitted' },
  })

  function goTo(next: number) {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  async function nextStep() {
    if (step === 1) {
      if (!selectedType) { toast.error('Please select a claim type'); return }
      goTo(2)
    } else if (step === 2) {
      const ok = await trigger(['incidentDate', 'incidentDescription', 'estimatedAmount'])
      if (ok) goTo(3)
    } else if (step === 3) {
      goTo(4)
    }
  }

  async function submitClaim(status: ClaimStatus) {
    const values = getValues()
    if (!selectedType) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, type: selectedType, status }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        toast.error(json.error ?? 'Failed to create claim')
        return
      }

      const claimId = json.data._id

      if (files.length > 0) {
        await uploadAll(claimId)
      }

      toast.success(status === 'submitted' ? 'Claim submitted successfully!' : 'Claim saved as draft')
      router.push(`/claims/${claimId}`)
    } finally {
      setSubmitting(false)
    }
  }

  const values = getValues()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">File a New Claim</h1>
        <p className="text-sm text-gray-500 mt-1">Complete all steps to submit your insurance claim.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <StepIndicator steps={STEPS} currentStep={step} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="p-6"
          >
            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Claim Type</h2>
                <p className="text-sm text-gray-500 mb-5">Choose the type of insurance claim you want to file.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CLAIM_TYPES.map(({ type, label, icon, description }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={[
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all',
                        selectedType === type
                          ? 'border-primary bg-primary-50'
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50',
                      ].join(' ')}
                    >
                      <span className="text-3xl">{icon}</span>
                      <span className="font-semibold text-gray-900 text-sm">{label}</span>
                      <span className="text-xs text-gray-500">{description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Incident Details</h2>
                <p className="text-sm text-gray-500 mb-5">Provide details about the incident.</p>
                <div className="space-y-4">
                  <Input
                    label="Incident Date"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    error={errors.incidentDate?.message}
                    {...register('incidentDate')}
                  />
                  <Textarea
                    label="Incident Description"
                    placeholder="Describe what happened in detail..."
                    rows={5}
                    error={errors.incidentDescription?.message}
                    hint="Minimum 20 characters. Be as detailed as possible."
                    {...register('incidentDescription')}
                  />
                  <Input
                    label="Estimated Claim Amount (USD)"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="5000"
                    error={errors.estimatedAmount?.message}
                    {...register('estimatedAmount')}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Supporting Documents</h2>
                <p className="text-sm text-gray-500 mb-5">Upload relevant documents. You can also add documents later.</p>
                <FileUploadZone files={files} onAdd={addFiles} onRemove={removeFile} />
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Review & Submit</h2>
                <p className="text-sm text-gray-500 mb-5">Review your claim before submitting.</p>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Claim Type</span>
                      {selectedType && <ClaimTypeIcon type={selectedType} />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Incident Date</span>
                      <span className="text-sm font-medium text-gray-900">
                        {values.incidentDate ? new Date(values.incidentDate).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm text-gray-500 shrink-0">Description</span>
                      <span className="text-sm text-gray-900 text-right line-clamp-3">
                        {values.incidentDescription || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Estimated Amount</span>
                      <span className="text-sm font-bold text-gray-900">
                        {values.estimatedAmount
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(values.estimatedAmount))
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Documents</span>
                      <span className="text-sm font-medium text-gray-900">
                        {files.length} file{files.length !== 1 ? 's' : ''} attached
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <Button
            variant="secondary"
            onClick={() => goTo(step - 1)}
            disabled={step === 1}
          >
            ← Back
          </Button>

          {step < 4 ? (
            <Button onClick={nextStep}>
              Next →
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                loading={submitting}
                onClick={() => submitClaim('draft')}
              >
                Save as Draft
              </Button>
              <Button
                loading={submitting || isUploading}
                onClick={() => submitClaim('submitted')}
              >
                Submit Claim
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
