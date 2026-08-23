def calculate_elo(winner_mmr, loser_mmr, k_factor=32):
    """
    Calculates the new Elo ratings for the winner and loser of a match.
    Returns (new_winner_mmr, new_loser_mmr)
    """
    expected_winner = 1 / (1 + 10 ** ((loser_mmr - winner_mmr) / 400))
    expected_loser = 1 / (1 + 10 ** ((winner_mmr - loser_mmr) / 400))
    
    new_winner_mmr = round(winner_mmr + k_factor * (1 - expected_winner))
    new_loser_mmr = round(loser_mmr + k_factor * (0 - expected_loser))
    
    return new_winner_mmr, new_loser_mmr
