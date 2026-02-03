import { type FormEvent, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBoards, getSessionStatus, getSprintsForBoard } from '@/lib/services/jiraApi'
import { useConfigStore } from '@/lib/stores/configStore'
import styles from './ConfigForm.module.scss'

type ConfigFormProps = {
  onRefresh: () => Promise<void>
}

const ConfigForm = ({ onRefresh }: ConfigFormProps) => {
  const {
    boardId,
    sprintId,
    setBoardId,
    setSprintId,
  } = useConfigStore()

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: getSessionStatus,
    staleTime: 5 * 60 * 1000,
  })

  const authReady = sessionQuery.data?.connected === true

  const boardsQuery = useQuery({
    queryKey: ['boards', authReady, 'scrum'],
    queryFn: () => getBoards('scrum'),
    enabled: authReady,
    staleTime: 5 * 60 * 1000,
  })

  const sprintsQuery = useQuery({
    queryKey: ['sprints', boardId],
    queryFn: () => getSprintsForBoard(boardId!),
    enabled: authReady && Boolean(boardId),
    staleTime: 60_000,
  })

  const orderedSprints = useMemo(
    () => sprintsQuery.data?.values ?? [],
    [sprintsQuery.data?.values],
  )

  useEffect(() => {
    if (!boardId && boardsQuery.data?.values && boardsQuery.data.values.length > 0) {
      setBoardId(boardsQuery.data.values[0].id)
    }
  }, [boardId, boardsQuery.data, setBoardId])

  useEffect(() => {
    if (!orderedSprints || orderedSprints.length === 0) {
      if (sprintId) setSprintId(undefined)
      return
    }
    if (sprintId && orderedSprints.some((s) => s?.id === sprintId)) return
    const activeSprint = orderedSprints.find((sprint) => sprint?.state === 'active')
    const selectedId = activeSprint?.id ?? orderedSprints[0]?.id
    if (selectedId) {
      setSprintId(selectedId)
    }
  }, [orderedSprints, setSprintId, sprintId])

  const handleRefresh = async (event: FormEvent) => {
    event.preventDefault()
    await onRefresh()
  }

  const handleConnect = () => {
    window.location.href = '/api/auth/atlassian/start'
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Setup</p>
          <h2 className={styles.title}>Jira connection</h2>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.refresh}
            type="button"
            onClick={handleConnect}
            disabled={sessionQuery.isFetching}
          >
            {authReady ? 'Reconnect Jira' : 'Connect Jira'}
          </button>
          <button
            className={styles.refresh}
            type="button"
            onClick={handleRefresh}
            disabled={!authReady}
          >
            Refresh data
          </button>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleRefresh}>
        {!authReady && (
          <p className={styles.error}>Connect to Jira to load boards and sprints.</p>
        )}

        <label className={styles.field}>
          <span>Board</span>
          <select
            value={boardId ?? ''}
            onChange={(e) => setBoardId(e.target.value ? Number(e.target.value) : undefined)}
            disabled={!authReady || boardsQuery.isLoading}
          >
            <option value="">Select a board</option>
            {boardsQuery.data?.values.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
          {boardsQuery.isError && (
            <p className={styles.error}>Unable to fetch boards. Check domain and token.</p>
          )}
        </label>

        <label className={styles.field}>
          <span>Sprint</span>
          <select
            value={sprintId ?? ''}
            onChange={(e) => setSprintId(e.target.value ? Number(e.target.value) : undefined)}
            disabled={!authReady || !boardId || sprintsQuery.isLoading}
          >
            <option value="">Select a sprint</option>
            {orderedSprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name} ({sprint.state})
              </option>
            ))}
          </select>
          {sprintsQuery.isError && (
            <p className={styles.error}>Unable to fetch sprints for this board.</p>
          )}
        </label>

        <p className={styles.meta}>
          Tip: Use `currentUser()` in JQL to keep the report scoped to you.
        </p>
      </form>
    </section>
  )
}

export default ConfigForm

