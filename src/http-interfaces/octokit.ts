import { Octokit } from '@octokit/core';
import { paginateRest } from '@octokit/plugin-paginate-rest';
import { isNil } from 'lodash-es';

const OctokitWithPlugin = Octokit.plugin(paginateRest);
export type OctokitWithPlugin = InstanceType<typeof OctokitWithPlugin>;

let octokit: OctokitWithPlugin;

export function getOctokit(): OctokitWithPlugin {
  if (isNil(octokit)) throw new Error('Octokit is not initialized');
  return octokit;
}

export function initialOctokit(token: string) {
  octokit = new OctokitWithPlugin({
    auth: token,
  });
}
