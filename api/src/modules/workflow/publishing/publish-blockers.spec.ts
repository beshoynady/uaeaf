import { Types } from 'mongoose';
import { PENDING_CONTENT_MARKER } from './pending-content.js';
import { describePublishBlockers, findPublishBlockers } from './publish-blockers.js';

const portrait = new Types.ObjectId('68c0000000000000000000aa');

describe('findPublishBlockers', () => {
  it('reports nothing when the record is complete', () => {
    expect(findPublishBlockers('presidentMessagePage', { featuredImageId: portrait, heroTitle: { ar: 'ع' } })).toEqual(
      [],
    );
  });

  it('reports a text field still carrying the marker', () => {
    const record = { featuredImageId: portrait, pullQuote: { ar: 'اقتباس', en: PENDING_CONTENT_MARKER } };

    expect(findPublishBlockers('presidentMessagePage', record)).toEqual([
      { kind: 'pendingContent', field: 'pullQuote.en' },
    ]);
  });

  // The marker is a string, so a missing image cannot carry it. Without this
  // rule the page publishes with an empty hero frame (ADR-0069 D5, owner
  // decision 2026-09-12).
  it('reports a required image that is null', () => {
    expect(findPublishBlockers('presidentMessagePage', { featuredImageId: null })).toEqual([
      { kind: 'missingRequired', field: 'featuredImageId' },
    ]);
  });

  it('reports a required image that is absent altogether', () => {
    expect(findPublishBlockers('presidentMessagePage', {})).toEqual([
      { kind: 'missingRequired', field: 'featuredImageId' },
    ]);
  });

  it('reports both kinds together rather than the first one found', () => {
    const record = { featuredImageId: null, pullQuote: { en: PENDING_CONTENT_MARKER } };

    expect(findPublishBlockers('presidentMessagePage', record)).toEqual([
      { kind: 'pendingContent', field: 'pullQuote.en' },
      { kind: 'missingRequired', field: 'featuredImageId' },
    ]);
  });

  it('requires nothing of a type with no requirements', () => {
    expect(findPublishBlockers('visionMissionPage', {})).toEqual([]);
  });

  it('treats an empty string as missing', () => {
    expect(findPublishBlockers('presidentMessagePage', { featuredImageId: '' })).toEqual([
      { kind: 'missingRequired', field: 'featuredImageId' },
    ]);
  });
});

describe('describePublishBlockers', () => {
  // Pending content is the refusal the editor cannot clear alone — the copy
  // is with the client. It leads, so the dashboard's alert names the thing
  // that needs someone else before the thing the editor can fix now.
  it('leads with the pending-content code when both are present', () => {
    const { code } = describePublishBlockers([
      { kind: 'missingRequired', field: 'featuredImageId' },
      { kind: 'pendingContent', field: 'pullQuote.en' },
    ]);

    expect(code).toBe('pendingContent');
  });

  it('uses the missing-field code when nothing is pending', () => {
    expect(describePublishBlockers([{ kind: 'missingRequired', field: 'featuredImageId' }]).code).toBe(
      'missingRequiredField',
    );
  });

  it('names every blocker in the message, not only the ones matching the code', () => {
    const { message } = describePublishBlockers([
      { kind: 'pendingContent', field: 'pullQuote.en' },
      { kind: 'missingRequired', field: 'featuredImageId' },
    ]);

    expect(message).toContain('pullQuote.en');
    expect(message).toContain('featuredImageId');
  });
});
