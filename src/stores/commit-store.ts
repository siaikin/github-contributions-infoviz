import { defineStore } from 'pinia';
import { RepositoryCommit } from 'components/search-panel/use-git-commit';
import {
  CommitSearchParams,
  ContributorSearchParams,
  presetDateRange,
} from 'src/components/search-panel/models';
import { useLocalStorage } from '@vueuse/core';

export const useCommitStore = defineStore('commit', {
  state: () => ({
    _commits: useLocalStorage(
      'pinia/commit/commits',
      {} as Record<string, Array<RepositoryCommit>>
    ),
    _searchParams: useLocalStorage('pinia/commit/searchParams', {
      tab: 'contributor',
      branches: [],
      contributors: [],
      collaborators: [],
      dateRange: presetDateRange[0].value as [string, string],
    } as CommitSearchParams),
    _contributorSearchParams: useLocalStorage(
      'pinia/commit/contributorSearchParams',
      {
        rankSize: 30,
        tab: 'rank',
      } as ContributorSearchParams
    ),
  }),
  getters: {
    commits: (state) => state._commits,
    searchParams: (state) => state._searchParams,
    contributorSearchParams: (state) => state._contributorSearchParams,
  },
  actions: {
    updateCommits(commits: Record<string, Array<RepositoryCommit>>) {
      this._commits = commits;
    },
    updateSearchParams(searchParams: Partial<CommitSearchParams>) {
      this._searchParams = {
        ...this._searchParams,
        ...searchParams,
      };
    },
    updateContributorSearchParams(
      searchParams: Partial<ContributorSearchParams>
    ) {
      this._contributorSearchParams = {
        ...this._contributorSearchParams,
        ...searchParams,
      };
    },
  },
});
