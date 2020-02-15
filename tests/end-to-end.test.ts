import fs from "fs-extra";
import path from "path";
import { formatFileStructure } from "../src/index/formatFileStructure";
import { buildGraph } from "../src/index/formatFileStructure/buildGraph";
import treeDir from "tree-node-cli";
import glob from "glob";

const tmpPath = path.join(__dirname, "tmp");

beforeAll(() => {
  fs.ensureDir(tmpPath);
});

afterAll(() => {
  fs.removeSync(tmpPath);
});

const treeDirWithContents = (dir: string) => {
  const files = fs.readdirSync(dir);
  let tree: Record<string, string> = {};
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      tree = {
        ...tree,
        ...treeDirWithContents(filePath),
      };
    } else {
      tree[path.relative(tmpPath, filePath)] = fs
        .readFileSync(filePath)
        .toString();
    }
  }

  return tree;
};

export const t = (folderPath: string, rootPath: string) => {
  it(path.basename(folderPath), async () => {
    const copyPath = path.join(tmpPath, folderPath);
    fs.copySync(folderPath, copyPath);
    const files = glob.sync(path.join(copyPath, "/**/*.js"));
    await formatFileStructure(files, files);
    // make sure no imports broke
    buildGraph(files, true);
    expect(treeDir(rootPath)).toMatchSnapshot();
    const treeContents = treeDirWithContents(copyPath);
    Object.keys(treeContents).forEach(k => {
      expect(treeContents[k]).toMatchSnapshot(k);
    });
  });
};

describe("end-to-end", () => {
  const fixturePath = path.join(__dirname, "fixtures");
  const testCases = fs.readdirSync(fixturePath);
  for (const testCase of testCases) {
    const folder = path.join(fixturePath, testCase);
    t(folder, testCase === "globals" ? path.join(folder, "src") : folder);
  }
});
