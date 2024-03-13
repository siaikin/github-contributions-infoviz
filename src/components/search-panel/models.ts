import dayjs from 'dayjs';
import { Repository } from 'components/search-panel/use-repositories';
import {
  getGitReferences,
  getRepositoryCollaborators,
  getRepositoryContributors,
} from 'src/http-interfaces';
import { components } from '@octokit/openapi-types';

const today = dayjs();

export const presetDateRange = [
  {
    label: 'This month',
    value: [
      today.startOf('month').format('YYYY-MM-DD'),
      today.endOf('month').format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'This year',
    value: [
      today.startOf('year').format('YYYY-MM-DD'),
      today.endOf('year').format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'Past month',
    value: [
      today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
      today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'Past year',
    value: [
      today.subtract(1, 'year').startOf('year').format('YYYY-MM-DD'),
      today.subtract(1, 'year').endOf('year').format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'Past 30 days',
    value: [
      today.subtract(30, 'day').format('YYYY-MM-DD'),
      today.format('YYYY-MM-DD'),
    ] as const,
  },
  {
    label: 'Past 60 days',
    value: [
      today.subtract(60, 'day').format('YYYY-MM-DD'),
      today.format('YYYY-MM-DD'),
    ] as const,
  },

  {
    label: 'Past 90 days',
    value: [
      today.subtract(90, 'day').format('YYYY-MM-DD'),
      today.format('YYYY-MM-DD'),
    ] as const,
  },

  {
    label: 'Past 365 days',
    value: [
      today.subtract(365, 'day').format('YYYY-MM-DD'),
      today.format('YYYY-MM-DD'),
    ] as const,
  },
] as const;

export interface CommitSearchParams {
  repository?: Repository;
  branches?: Awaited<ReturnType<typeof getGitReferences>>['data'];
  tags?: Awaited<ReturnType<typeof getGitReferences>>['data'];
  contributors?: Awaited<ReturnType<typeof getRepositoryContributors>>['data'];
  collaborators?: Awaited<
    ReturnType<typeof getRepositoryCollaborators>
  >['data'];
  dateRange?: [string, string];
  tab?: 'branch' | 'contributor' | 'collaborator';
}

export interface ContributorSearchParams {
  rankSize?: number;
  tab?: 'rank' | 'select';
}

export type Contributor = components['schemas']['contributor'];
