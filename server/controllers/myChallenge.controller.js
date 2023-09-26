const ChallengeInfo = require('../models/challengeInfo.model');
const UserChallenge = require('../models/userChallenge.model');

module.exports = {
  registerMyChallenge: async (req, res) => {
    try {
      const userChallengeInfo = req.body;

      const userChallenge = await UserChallenge.findOne({
        userInfo_id: userChallengeInfo.userInfoId,
      });

      const challengeInfo = await ChallengeInfo.findById(userChallengeInfo.challengeId);

      if (userChallenge) {
        return res.status(409).json({
          error: 'My challenge already registered',
        });
      }

      const userRegisterData = {
        depositMethod: '',
        deposit: 0,
        completeNum: challengeInfo.challengeTotalVerificationNum,
        successRate: 100,
        isSuccess: false,
        totalPayback: 0,
        profit: 0,
        challengeReward: 0,
        receivedYieldAmount: 0,
        claimChallenge: false,
        userInfo_id: userChallengeInfo.userInfoId,
        challenge_id: userChallengeInfo.challengeId,
      };

      const userChallengeData = await UserChallenge.create(userRegisterData);

      res.status(200).json({
        message: 'My challenge registered',
        userChallengeId: userChallengeData._id,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        error: 'Internal Server Error',
      });
    }
  },
  getMyStatus: async (req, res) => {
    try {
      const userChallengeInfo = await UserChallenge.findById(req.params.userChallengeId);

      if (!userChallengeInfo) {
        return res.status(404).json({
          error: 'User Challenge not found',
        });
      }

      const challengeInfo = await ChallengeInfo.findById(userChallengeInfo.challenge_id);

      //console.log(userChallengeInfo);
      //console.log(challengeInfo);

      res.status(200).json({
        message: 'My status found',
        myStatus: {
          challengeId: challengeInfo._id,
          successRate: userChallengeInfo.successRate,
          deposit: userChallengeInfo.deposit,
          challengeStatus: challengeInfo.challengeStatus,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        error: 'Internal Server Error',
      });
    }
  },
  getTotalStatus: async (req, res) => {
    try {
      const userChallengeInfo = await UserChallenge.findById(req.params.userChallengeId);

      if (!userChallengeInfo) {
        return res.status(404).json({
          error: 'User Challenge not found',
        });
      }

      const challengeInfo = await ChallengeInfo.findById(userChallengeInfo.challenge_id);

      const cryptoYieldBoostAmount =
        challengeInfo.challengeCryptoDeposit * challengeInfo.cryptoYield * 0.01;
      const totalStatus = {
        challengeId: challengeInfo._id,
        challengeTotalDeposit: challengeInfo.challengeTotalDeposit,
        cryptoYieldBoost: cryptoYieldBoostAmount,
        cashSuccessPool: challengeInfo.cashSuccessPool,
        cashFailPool: challengeInfo.cashFailPool,
        challengeCryptoDeposit: challengeInfo.challengeCryptoDeposit,
        cryptoSuccessPool: challengeInfo.cryptoSuccessPool,
        cryptoFailPool: challengeInfo.cryptoFailPool,
      };

      res.status(200).json({
        message: 'Total status found',
        totalStatus,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        error: 'Internal Server Error',
      });
    }
  },
  getPayback: async (req, res) => {
    try {
      const userChallengeInfo = await UserChallenge.findById(req.params.userChallengeId);

      if (!userChallengeInfo) {
        return res.status(404).json({
          error: 'User Challenge not found',
        });
      }

      const challengeInfo = await ChallengeInfo.findById(userChallengeInfo.challenge_id);
      if (userChallengeInfo.depositMethod === 'cash') {
        let profit = 0;

        if (userChallengeInfo.successRate === 100) {
          userChallengeInfo.totalPayback =
            userChallengeInfo.deposit +
            (challengeInfo.cashFailPool * 0.6 * userChallengeInfo.deposit) /
              challengeInfo.challengeCashDeposit;
          profit = userChallengeInfo.totalPayback - userChallengeInfo.deposit;
        } else if (userChallengeInfo.successRate >= 80) {
          userChallengeInfo.totalPayback = userChallengeInfo.deposit;
        } else {
          userChallengeInfo.totalPayback =
            userChallengeInfo.deposit *
            (userChallengeInfo.completeNum / challengeInfo.challengeRequiredCompleteNum);
        }

        const userChallengeData = await UserChallenge.findByIdAndUpdate(
          req.params.userChallengeId,
          {
            $set: {
              totalPayback: userChallengeInfo.totalPayback,
              profit: profit,
              challengeReward: (profit / userChallengeInfo.deposit) * 100,
            },
          },
          { new: true }
        );

        res.status(200).json({
          message: 'Payback found',
          payback: {
            successRate: userChallengeData.successRate,
            totalPayback: userChallengeData.totalPayback,
            profit: userChallengeData.profit,
            challengeReward: userChallengeData.challengeReward,
            cryptoYieldBoost:
              (userChallengeData.receivedYieldAmount / userChallengeData.deposit) * 100,
          },
        });
      } else {
        let profit = 0;
        let receivedYieldAmount =
          userChallengeInfo.deposit *
          challengeInfo.cryptoYield *
          0.01 *
          (challengeInfo.challengeTotalVerificationNum / 365);
        let challengeReward =
          (challengeInfo.cryptoFailPool * 0.6 * userChallengeInfo.deposit) /
          challengeInfo.challengeCryptoDeposit;

        if (userChallengeInfo.successRate === 100) {
          userChallengeInfo.totalPayback =
            userChallengeInfo.deposit + challengeReward + receivedYieldAmount;

          profit = userChallengeInfo.totalPayback - userChallengeInfo.deposit;
        } else if (userChallengeInfo.successRate >= 80) {
          userChallengeInfo.totalPayback =
            userChallengeInfo.deposit + receivedYieldAmount;

          profit = userChallengeInfo.totalPayback - userChallengeInfo.deposit;
          challengeReward = 0;
        } else {
          userChallengeInfo.totalPayback =
            userChallengeInfo.deposit *
            (userChallengeInfo.completeNum / challengeInfo.challengeRequiredCompleteNum);
          receivedYieldAmount = 0;
          challengeReward = 0;
        }

        const userChallengeData = await UserChallenge.findByIdAndUpdate(
          req.params.userChallengeId,
          {
            $set: {
              totalPayback: userChallengeInfo.totalPayback,
              profit: profit,
              challengeReward: (challengeReward / userChallengeInfo.deposit) * 100,
              receivedYieldAmount: receivedYieldAmount,
            },
          },
          { new: true }
        );

        res.status(200).json({
          message: 'Payback found',
          payback: {
            successRate: userChallengeData.successRate,
            totalPayback: userChallengeData.totalPayback,
            profit: userChallengeData.profit,
            challengeReward: userChallengeData.challengeReward,
            cryptoYieldBoost:
              (userChallengeData.receivedYieldAmount / userChallengeData.deposit) * 100,
          },
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({
        error: 'Internal Server Error',
      });
    }
  },
};
