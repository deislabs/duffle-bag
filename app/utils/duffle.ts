import * as path from 'path';

import { Errorable } from '../utils/errorable';
import * as shell from '../utils/shell';
import * as pairs from '../utils/pairs';

async function invokeObj<T>(sh: shell.Shell, command: string, args: string, opts: shell.ExecOpts, fn: (stdout: string) => T): Promise<Errorable<T>> {
    const bin = 'd:\\GoProjects\\src\\github.com\\deis\\duffle\\bin\\duffle.exe' /* config.dufflePath() */ || 'duffle';
    const cmd = `${bin} ${command} ${args}`;
    console.log(`$ ${cmd}`);
    return await sh.execObj<T>(
        cmd,
        `duffle ${command}`,
        opts,
        andLog(fn)
    );
}

function andLog<T>(fn: (s: string) => T): (s: string) => T {
    return (s: string) => {
        console.log(s);
        return fn(s);
    };
}

export function home(sh: shell.Shell): string {
    return process.env['DUFFLE_HOME'] || path.join(sh.home(), '.duffle');
}

export function list(sh: shell.Shell): Promise<Errorable<string[]>> {
    function parse(stdout: string): string[] {
        return stdout.split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
    }
    return invokeObj(sh, 'list', '', {}, parse);
}

export async function listRepos(sh: shell.Shell): Promise<Errorable<string[]>> {
    return { succeeded: true, result: ["hub.cnlabs.io"] };
}

export function listCredentialSets(sh: shell.Shell): Promise<Errorable<string[]>> {
    function parse(stdout: string): string[] {
        return stdout.split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
    }
    return invokeObj(sh, 'credentials list', '', {}, parse);
}

export async function upgrade(sh: shell.Shell, bundleName: string): Promise<Errorable<null>> {
    return await invokeObj(sh, 'upgrade', bundleName, {}, (s) => null);
}

export async function uninstall(sh: shell.Shell, bundleName: string): Promise<Errorable<null>> {
    return await invokeObj(sh, 'uninstall', bundleName, {}, (s) => null);
}

export async function pushFile(sh: shell.Shell, filePath: string, repo: string): Promise<Errorable<null>> {
    return await invokeObj(sh, 'push', `-f "${filePath}" --repo ${repo}`, {}, (s) => null);
}

export async function installFile(sh: shell.Shell, bundleFilePath: string, name: string, params: { [key: string]: string }, credentialSet: string | undefined): Promise<Errorable<null>> {
    return await invokeObj(sh, 'install', `${name} -f "${bundleFilePath}" ${paramsArgs(params)} ${credentialArg(credentialSet)}`, {}, (s) => null);
}

export async function installBundle(sh: shell.Shell, bundleName: string, name: string, params: { [key: string]: string }, credentialSet: string | undefined): Promise<Errorable<null>> {
    return await invokeObj(sh, 'install', `${name} ${bundleName} ${paramsArgs(params)} ${credentialArg(credentialSet)}`, {}, (s) => null);
}

function paramsArgs(parameters: { [key: string]: string }): string {
    return pairs.fromStringMap(parameters)
        .filter((p) => !!p.value)
        .map((p) => `--set ${p.key}=${shell.safeValue(p.value)}`)
        .join(' ');
}

function credentialArg(credentialSet: string | undefined): string {
    if (credentialSet) {
        return `-c ${credentialSet}`;
    }
    return '';
}

export async function addCredentialSets(sh: shell.Shell, files: string[]): Promise<Errorable<null>> {
    const filesArg = files.map((f) => `"${f}"`).join(' ');
    return await invokeObj(sh, 'credential add', filesArg, {}, (s) => null);
}

export async function deleteCredentialSet(sh: shell.Shell, credentialSetName: string): Promise<Errorable<null>> {
    return await invokeObj(sh, 'credential remove', credentialSetName, {}, (s) => null);
}

export async function generateCredentialsForFile(sh: shell.Shell, bundleFilePath: string, name: string): Promise<Errorable<null>> {
    return await invokeObj(sh, 'credentials generate', `${name} -f "${bundleFilePath}"`, {}, (s) => null);
}

export async function generateCredentialsForBundle(sh: shell.Shell, bundleName: string, name: string): Promise<Errorable<null>> {
    return await invokeObj(sh, 'credentials generate', `${name} ${bundleName}`, {}, (s) => null);
}
