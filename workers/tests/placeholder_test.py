import workers


def test_workers(capsys):
    workers.main()
    captured = capsys.readouterr()
    assert captured.out == "Hello from workers!\n"
