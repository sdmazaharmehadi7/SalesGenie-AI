function DataTable({ columns, data, emptyMessage = 'No results found.', getRowId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-line-default bg-surface-subtle text-xs font-medium text-ink-muted">
          <tr>
            {columns.map((column) => (
              <th className={['whitespace-nowrap px-5 py-3.5', column.headerClassName ?? ''].join(' ')} key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-default bg-surface-default">
          {data.length > 0 ? data.map((row) => (
            <tr className="transition-colors hover:bg-surface-subtle" key={getRowId(row)}>
              {columns.map((column) => (
                <td className={['px-5 py-4', column.cellClassName ?? ''].join(' ')} key={column.key}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td className="px-5 py-12 text-center text-sm text-ink-muted" colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
