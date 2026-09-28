import { Module } from '@nestjs/common';
import { STEP_UP_VERIFIER, UnavailableStepUpVerifier } from './archive-restore.js';

/**
 * The one place step-up verification is bound.
 *
 * Every service that performs an irreversible deletion imports this and injects
 * `STEP_UP_VERIFIER`, so the check cannot be skipped by a caller that does not
 * go through a route — and the implementation is replaced here, once, rather
 * than in each of them (ADR-0120 §D3).
 */
@Module({
  providers: [{ provide: STEP_UP_VERIFIER, useClass: UnavailableStepUpVerifier }],
  exports: [STEP_UP_VERIFIER],
})
export class StepUpModule {}
