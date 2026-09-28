import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { WorkflowStepsService } from './workflow-steps.service.js';
import { WorkflowStepsRepository } from './workflow-steps.repository.js';

/**
 * Fix round 1 (CLAUDE.md §31): `create()`'s `unsatisfiableStep` check
 * (required approvals vs. distinct assignees) is re-run on `update()`
 * against the MERGED state — the current stored step with whichever of
 * `requiredApprovals`/`assigneeIds` the patch actually sends applied on top
 * — not against the patch body alone. A check that only fired when BOTH
 * fields were sent together would miss the case a real caller hits most:
 * raising the threshold in one save without touching the assignee list.
 */
describe('WorkflowStepsService.update — the merged-state unsatisfiableStep check', () => {
  const id = new Types.ObjectId().toString();
  const assigneeA = new Types.ObjectId();
  const assigneeB = new Types.ObjectId();
  const assigneeC = new Types.ObjectId().toString();

  const storedStep = {
    _id: new Types.ObjectId(id),
    workflowDefinitionId: new Types.ObjectId(),
    sequenceOrder: 1,
    stepType: 'Parallel',
    assigneeType: 'User',
    assigneeIds: [assigneeA, assigneeB],
    requiredApprovals: 2,
  };

  const makeRepository = () =>
    ({
      findById: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<WorkflowStepsRepository>;

  it('refuses requiredApprovals raised above the assignees already stored, sent alone', async () => {
    const repository = makeRepository();
    repository.findById.mockResolvedValue(storedStep as never);
    const service = new WorkflowStepsService(repository);

    // Only `requiredApprovals` is sent. The stored step has 2 distinct
    // assignees; 5 needs three more nobody named. A check that looked only
    // at the patch body (with no `assigneeIds` in it) would have nothing to
    // compare against and let this through.
    await expect(service.update(id, { requiredApprovals: 5 } as never)).rejects.toThrow(BadRequestException);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('succeeds when requiredApprovals is raised and enough new assignees are sent in the same patch', async () => {
    const repository = makeRepository();
    repository.findById.mockResolvedValue(storedStep as never);
    repository.updateById.mockResolvedValue({ ...storedStep, requiredApprovals: 3 } as never);
    const service = new WorkflowStepsService(repository);

    // The inverse of the case above: without reading the MERGED state (patch
    // fields on top of what is not sent), a fix that simply refused every
    // requiredApprovals raise would wrongly fail this one too.
    await service.update(id, {
      requiredApprovals: 3,
      assigneeIds: [assigneeA.toString(), assigneeB.toString(), assigneeC],
    } as never);

    expect(repository.updateById).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when no such step exists, before any check runs', async () => {
    const repository = makeRepository();
    repository.findById.mockResolvedValue(null);
    const service = new WorkflowStepsService(repository);

    await expect(service.update(id, { requiredApprovals: 1 } as never)).rejects.toThrow(NotFoundException);
    expect(repository.updateById).not.toHaveBeenCalled();
  });
});
