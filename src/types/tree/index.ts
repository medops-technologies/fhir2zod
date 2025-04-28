export type DependencyMap = {
    [key: string]: string[]
}

export type TreeNode<T> = {
    value: T
    children: TreeNode<T>[]
}
